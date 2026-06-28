defmodule Storymap.ContentReports do
  @moduledoc """
  User-submitted content reports (e.g. inaccurate or abusive pins).

  Admin queue updates go through [`Storymap.AdminPubSub`](Storymap.AdminPubSub) only.
  Unresolved count is **global** (same for all admins). Activity unread is per-admin
  and excludes `content_reported` audit events.
  """

  import Ecto.Query
  import Storymap.Admin, only: [is_admin_level: 1]

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.AdminActivity
  alias Storymap.AdminPubSub
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Pins
  alias Storymap.Pins.Comments
  alias Storymap.Pins.Pin
  alias Storymap.Pins.PinComment
  alias Storymap.Repo
  alias Storymap.Types

  @type create_error :: {:error, :invalid_subject} | {:error, :not_found}
  @type subject_type :: ContentReport.subject_type()
  @type create_attrs :: ContentReport.create_attrs()

  @type activity_metadata :: %{
          optional(String.t()) => integer() | String.t() | nil
        }

  @type resolve_result :: {:ok, create_attrs(), activity_metadata()} | create_error()

  @doc """
  Creates a report for an existing pin or pin comment. Notifies admins via AdminPubSub.
  """
  @spec create_report(create_attrs() | keyword(), integer() | nil) ::
          Types.ecto_result(ContentReport.t()) | create_error()
  def create_report(attrs, reporter_user_id \\ nil)
      when is_map(attrs) or is_list(attrs) do
    attrs = for {k, v} <- Enum.into(attrs, %{}), into: %{}, do: {to_string(k), v}

    with {:ok, subject_type, subject_id} <- fetch_subject(attrs),
         :ok <- ensure_subject_type(subject_type),
         {:ok, attrs, activity_metadata} <- resolve_subject(subject_type, subject_id, attrs) do
      ContentReport.create_changeset(attrs, reporter_user_id: reporter_user_id)
      |> Repo.insert()
      |> case do
        {:ok, %ContentReport{} = report} ->
          activity_metadata =
            activity_metadata
            |> Map.put("report_id", report.id)
            |> Map.put("category", to_string(report.category))

          _ = AdminActivity.record_event("content_reported", reporter_user_id, activity_metadata)

          report = Repo.preload(report, :reporter)
          AdminPubSub.broadcast_report_created(report)
          AdminPubSub.broadcast_counts_for_all_admins()
          {:ok, report}

        {:error, _} = err ->
          err
      end
    else
      {:error, _} = err -> err
    end
  end

  @doc """
  Returns the pin id associated with a content report, if any.
  """
  @spec report_pin_id(ContentReport.t()) :: integer() | nil
  def report_pin_id(%ContentReport{subject_type: "pin", subject_id: pin_id})
      when is_integer(pin_id),
      do: pin_id

  def report_pin_id(%ContentReport{subject_type: "pin_comment", subject_id: comment_id})
      when is_integer(comment_id) do
    case Repo.get(PinComment, comment_id) do
      %PinComment{pin_id: pin_id} -> pin_id
      nil -> nil
    end
  end

  def report_pin_id(_), do: nil

  @spec resolve_subject(String.t(), integer(), create_attrs()) :: resolve_result()
  defp resolve_subject("pin", pin_id, attrs) do
    case Pins.get_pin(pin_id) do
      %Pin{} = pin ->
        attrs =
          attrs
          |> Map.put("subject_label", pin.title)
          |> Map.put("subject_type", "pin")
          |> Map.put("subject_id", pin_id)
          |> Map.put("sub_map_id", pin.sub_map_id)

        activity = %{
          "pin_id" => pin.id,
          "category" => Map.get(attrs, "category"),
          "title" => pin.title
        }

        {:ok, attrs, activity}

      nil ->
        {:error, :not_found}
    end
  end

  defp resolve_subject("pin_comment", comment_id, attrs) do
    case Comments.get_comment(comment_id) do
      %PinComment{deleted_at: nil} = comment ->
        comment = Repo.preload(comment, :pin)

        case comment.pin do
          %Pin{} = pin ->
            attrs =
              attrs
              |> Map.put("subject_label", "Comment on «#{pin.title}»")
              |> put_comment_report_details(comment.body)
              |> Map.put("subject_type", "pin_comment")
              |> Map.put("subject_id", comment_id)
              |> Map.put("sub_map_id", pin.sub_map_id)

            activity = %{
              "comment_id" => comment.id,
              "comment_body" => comment.body,
              "pin_id" => pin.id,
              "category" => Map.get(attrs, "category"),
              "title" => pin.title
            }

            {:ok, attrs, activity}

          _ ->
            {:error, :not_found}
        end

      %PinComment{} ->
        {:error, :not_found}

      nil ->
        {:error, :not_found}
    end
  end

  defp resolve_subject(_, _, _), do: {:error, :not_found}

  @spec fetch_subject(create_attrs()) ::
          {:ok, String.t(), integer()} | {:error, :invalid_subject}
  defp fetch_subject(%{"subject_type" => st, "subject_id" => sid}) when is_binary(st) do
    case Integer.parse(to_string(sid)) do
      {id, ""} -> {:ok, st, id}
      _ -> {:error, :invalid_subject}
    end
  end

  defp fetch_subject(_), do: {:error, :invalid_subject}

  @details_max_length 2000
  @comment_details_separator "\n\n---\n\n"

  @spec put_comment_report_details(create_attrs(), String.t()) :: create_attrs()
  defp put_comment_report_details(attrs, comment_body) do
    reporter_notes = extract_reporter_notes(attrs)

    Map.put(attrs, "details", build_comment_report_details(comment_body, reporter_notes))
  end

  @spec extract_reporter_notes(create_attrs()) :: String.t() | nil
  defp extract_reporter_notes(attrs) do
    case Map.get(attrs, "details") do
      reporter when is_binary(reporter) ->
        trimmed = String.trim(reporter)
        if trimmed != "", do: trimmed

      _ ->
        nil
    end
  end

  @doc false
  @spec build_comment_report_details(String.t(), String.t() | nil) :: String.t()
  def build_comment_report_details(comment_body, reporter_notes) do
    case reporter_notes do
      nil ->
        String.slice(comment_body, 0, @details_max_length)

      notes ->
        separator = @comment_details_separator
        sep_len = String.length(separator)
        notes_len = String.length(notes)

        if notes_len + sep_len >= @details_max_length do
          String.slice(notes, 0, @details_max_length)
        else
          max_comment_len = @details_max_length - sep_len - notes_len
          String.slice(comment_body, 0, max_comment_len) <> separator <> notes
        end
    end
  end

  @spec ensure_subject_type(String.t()) :: :ok | {:error, :invalid_subject}
  defp ensure_subject_type(type) when type in ["pin", "pin_comment"], do: :ok
  defp ensure_subject_type(_), do: {:error, :invalid_subject}

  @spec list_reports_for_admin(Scope.t(), keyword()) :: [ContentReport.t()]
  def list_reports_for_admin(scope, opts \\ [])

  def list_reports_for_admin(%Scope{user: %User{admin_level: admin_level}}, opts)
      when is_admin_level(admin_level) do
    limit = Keyword.get(opts, :limit, 50)

    from(r in ContentReport,
      order_by: [desc: r.inserted_at, desc: r.id],
      limit: ^limit
    )
    |> Repo.all()
    |> Repo.preload(:reporter)
  end

  def list_reports_for_admin(_scope, _opts), do: []

  @spec unresolved_count(Scope.t()) :: non_neg_integer()
  def unresolved_count(%Scope{user: %User{admin_level: admin_level}})
      when is_admin_level(admin_level) do
    unresolved_count_global()
  end

  def unresolved_count(_scope), do: 0

  @spec unresolved_count_global() :: non_neg_integer()
  def unresolved_count_global do
    from(r in ContentReport, where: is_nil(r.resolved_at), select: count(r.id))
    |> Repo.one()
  end

  @spec resolve_report(Scope.t(), integer()) ::
          Types.ecto_result(ContentReport.t())
          | {:ok, :noop}
          | Types.unauthorized()
          | {:error, :not_found}
  def resolve_report(%Scope{user: %User{admin_level: admin_level}}, id)
      when is_admin_level(admin_level) and is_integer(id) do
    case Repo.get(ContentReport, id) do
      nil ->
        {:error, :not_found}

      %ContentReport{resolved_at: nil} = report ->
        report
        |> ContentReport.resolve_changeset()
        |> Repo.update()
        |> case do
          {:ok, %ContentReport{} = updated} ->
            broadcast_report_updated(updated)
            AdminPubSub.broadcast_counts_for_all_admins()
            {:ok, updated}

          err ->
            err
        end

      %ContentReport{} ->
        {:ok, :noop}
    end
  end

  def resolve_report(_scope, _id), do: {:error, :unauthorized}

  @spec unresolve_report(Scope.t(), integer()) ::
          Types.ecto_result(ContentReport.t())
          | {:ok, :noop}
          | Types.unauthorized()
          | {:error, :not_found}
  def unresolve_report(%Scope{user: %User{admin_level: admin_level}}, id)
      when is_admin_level(admin_level) and is_integer(id) do
    case Repo.get(ContentReport, id) do
      nil ->
        {:error, :not_found}

      %ContentReport{resolved_at: nil} ->
        {:ok, :noop}

      %ContentReport{} = report ->
        report
        |> ContentReport.unresolve_changeset()
        |> Repo.update()
        |> case do
          {:ok, %ContentReport{} = updated} ->
            broadcast_report_updated(updated)
            AdminPubSub.broadcast_counts_for_all_admins()
            {:ok, updated}

          err ->
            err
        end
    end
  end

  def unresolve_report(_scope, _id), do: {:error, :unauthorized}

  @spec mark_all_resolved(Scope.t()) :: :ok | Types.unauthorized()
  def mark_all_resolved(%Scope{user: %User{admin_level: admin_level}} = _scope)
      when is_admin_level(admin_level) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    from(r in ContentReport, where: is_nil(r.resolved_at))
    |> Repo.update_all(set: [resolved_at: now, updated_at: now])

    AdminPubSub.broadcast_reports_bulk_resolved()
    AdminPubSub.broadcast_counts_for_all_admins()
    :ok
  end

  def mark_all_resolved(_scope), do: {:error, :unauthorized}

  defp broadcast_report_updated(%ContentReport{} = report) do
    report = Repo.preload(report, :reporter)
    AdminPubSub.broadcast_report_updated(report)
  end
end
