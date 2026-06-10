defmodule Storymap.ContentReports do
  @moduledoc """
  User-submitted content reports (e.g. inaccurate or abusive pins).

  Admin queue updates go through [`Storymap.AdminPubSub`](Storymap.AdminPubSub) only.
  Unresolved count is **global** (same for all admins). Activity unread is per-admin
  and excludes `content_reported` audit events.
  """

  import Ecto.Query, warn: false
  import Storymap.Admin, only: [is_admin_level: 1]

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.AdminActivity
  alias Storymap.AdminPubSub
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Pins
  alias Storymap.Pins.Pin
  alias Storymap.Repo

  @doc """
  Creates a report for an existing pin. Notifies admins via AdminPubSub.
  """
  def create_report(attrs, reporter_user_id \\ nil)
      when is_map(attrs) or is_list(attrs) do
    attrs = for {k, v} <- Enum.into(attrs, %{}), into: %{}, do: {to_string(k), v}

    with {:ok, subject_type, subject_id} <- fetch_subject(attrs),
         :ok <- ensure_subject_type_pin(subject_type),
         %Pin{} = pin <- Pins.get_pin(subject_id) do
      attrs =
        attrs
        |> Map.put("subject_label", pin.title)
        |> Map.put("subject_type", subject_type)
        |> Map.put("subject_id", subject_id)
        |> Map.put("sub_map_id", pin.sub_map_id)

      ContentReport.create_changeset(attrs, reporter_user_id: reporter_user_id)
      |> Repo.insert()
      |> case do
        {:ok, %ContentReport{} = report} ->
          _ =
            AdminActivity.record_event("content_reported", reporter_user_id, %{
              "pin_id" => pin.id,
              "report_id" => report.id,
              "category" => report.category,
              "title" => pin.title
            })

          report = Repo.preload(report, :reporter)
          AdminPubSub.broadcast_report_created(report)
          AdminPubSub.broadcast_counts_for_all_admins()
          {:ok, report}

        {:error, _} = err ->
          err
      end
    else
      {:error, _} = err -> err
      _ -> {:error, :not_found}
    end
  end

  defp fetch_subject(%{"subject_type" => st, "subject_id" => sid}) when is_binary(st) do
    case Integer.parse(to_string(sid)) do
      {id, ""} -> {:ok, st, id}
      _ -> {:error, :invalid_subject}
    end
  end

  defp fetch_subject(_), do: {:error, :invalid_subject}

  defp ensure_subject_type_pin("pin"), do: :ok
  defp ensure_subject_type_pin(_), do: {:error, :invalid_subject}

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

  def unresolved_count(%Scope{user: %User{admin_level: admin_level}})
      when is_admin_level(admin_level) do
    unresolved_count_global()
  end

  def unresolved_count(_scope), do: 0

  def unresolved_count_global do
    from(r in ContentReport, where: is_nil(r.resolved_at), select: count(r.id))
    |> Repo.one()
  end

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
