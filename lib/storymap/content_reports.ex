defmodule Storymap.ContentReports do
  @moduledoc """
  User-submitted content reports (e.g. inaccurate or abusive pins).
  """

  import Ecto.Query, warn: false

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.AdminActivity
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Pins
  alias Storymap.Pins.Pin
  alias Storymap.Repo

  @pubsub_topic "content_reports:events"

  def pubsub_topic, do: @pubsub_topic

  @doc """
  Creates a report for an existing pin. Broadcasts to admins.
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

          Phoenix.PubSub.broadcast(
            Storymap.PubSub,
            @pubsub_topic,
            {:content_report_created, report}
          )

          StorymapWeb.Endpoint.broadcast("admin:reports", "counts_changed", %{})

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
      when admin_level >= 10 do
    limit = Keyword.get(opts, :limit, 50)

    from(r in ContentReport,
      order_by: [desc: r.inserted_at, desc: r.id],
      limit: ^limit
    )
    |> Repo.all()
    |> Repo.preload(:reporter)
  end

  def list_reports_for_admin(_scope, _opts), do: []

  def get_report!(%Scope{user: %User{admin_level: admin_level}}, id)
      when admin_level >= 10 and is_integer(id) do
    Repo.get!(ContentReport, id) |> Repo.preload(:reporter)
  end

  def unresolved_count(%Scope{user: %User{admin_level: admin_level}}) when admin_level >= 10 do
    from(r in ContentReport, where: is_nil(r.resolved_at), select: count(r.id))
    |> Repo.one()
  end

  def unresolved_count(_scope), do: 0

  def resolve_report(%Scope{user: %User{admin_level: admin_level}} = scope, id)
      when admin_level >= 10 and is_integer(id) do
    case Repo.get(ContentReport, id) do
      nil ->
        {:error, :not_found}

      %ContentReport{resolved_at: nil} = report ->
        report
        |> ContentReport.resolve_changeset()
        |> Repo.update()
        |> case do
          {:ok, %ContentReport{} = updated} ->
            broadcast_updated(scope, updated)
            {:ok, updated}

          err ->
            err
        end

      %ContentReport{} ->
        {:ok, :noop}
    end
  end

  def resolve_report(_scope, _id), do: {:error, :unauthorized}

  def unresolve_report(%Scope{user: %User{admin_level: admin_level}} = scope, id)
      when admin_level >= 10 and is_integer(id) do
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
            broadcast_updated(scope, updated)
            {:ok, updated}

          err ->
            err
        end
    end
  end

  def unresolve_report(_scope, _id), do: {:error, :unauthorized}

  def mark_all_resolved(%Scope{user: %User{admin_level: admin_level}} = _scope)
      when admin_level >= 10 do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    from(r in ContentReport, where: is_nil(r.resolved_at))
    |> Repo.update_all(set: [resolved_at: now, updated_at: now])

    Phoenix.PubSub.broadcast(
      Storymap.PubSub,
      @pubsub_topic,
      {:content_reports_bulk_resolved, %{}}
    )

    StorymapWeb.Endpoint.broadcast("admin:reports", "counts_changed", %{})
    :ok
  end

  def mark_all_resolved(_scope), do: {:error, :unauthorized}

  defp broadcast_updated(_scope, %ContentReport{} = report) do
    report = Repo.preload(report, :reporter)
    Phoenix.PubSub.broadcast(Storymap.PubSub, @pubsub_topic, {:content_report_updated, report})
    StorymapWeb.Endpoint.broadcast("admin:reports", "counts_changed", %{})
  end
end
