defmodule Storymap.AdminPubSub do
  @moduledoc """
  Single PubSub bus for admin activity, content reports, and nav badge counts.

  Topic: `"admin:updates"` (see `topic/0`).

  ## Messages

  - `{:activity_event, event}` — new row in `admin_activity_events`
  - `{:activity_reads_changed, admin_user_id}` — per-admin read state changed
  - `{:report_created, report}` — new content report
  - `{:report_updated, report}` — report resolved or unresolved
  - `{:reports_bulk_resolved}` — all reports marked resolved
  - `{:counts_changed, admin_user_id, %{activity_unread: n, reports_unresolved: m}}` — nav badge counts (`admin_user_id` may be `nil` for reports-only global broadcast)

  Contexts must broadcast through this module only (not `Phoenix.PubSub` or channels directly).
  """

  import Ecto.Query, warn: false

  alias Storymap.Accounts.Scope
  alias Storymap.AdminActivity
  alias Storymap.ContentReports
  alias Storymap.Repo

  @pubsub Storymap.PubSub
  @topic "admin:updates"

  def topic, do: @topic

  def subscribe, do: Phoenix.PubSub.subscribe(@pubsub, @topic)

  def broadcast(message) when is_tuple(message) or is_atom(message) do
    Phoenix.PubSub.broadcast(@pubsub, @topic, message)
  end

  def broadcast_activity_event(event) do
    broadcast({:activity_event, event})
  end

  def broadcast_activity_reads_changed(admin_user_id) when is_integer(admin_user_id) do
    broadcast({:activity_reads_changed, admin_user_id})
  end

  def broadcast_report_created(report) do
    broadcast({:report_created, report})
  end

  def broadcast_report_updated(report) do
    broadcast({:report_updated, report})
  end

  def broadcast_reports_bulk_resolved do
    broadcast(:reports_bulk_resolved)
  end

  @doc """
  Re-queries badge counts for an admin scope and broadcasts `{:counts_changed, admin_user_id, counts}`.
  Pass `nil` scope to broadcast global reports count only (`admin_user_id` is `nil`).
  """
  def broadcast_counts_changed(%Scope{user: %{id: admin_user_id}} = scope) do
    counts = counts_for_scope(scope)
    broadcast({:counts_changed, admin_user_id, counts})
    counts
  end

  def broadcast_counts_changed(nil) do
    counts = %{activity_unread: 0, reports_unresolved: ContentReports.unresolved_count_global()}
    broadcast({:counts_changed, nil, counts})
    counts
  end

  def counts_for_scope(%Scope{} = scope) do
    %{
      activity_unread: AdminActivity.unread_count(scope),
      reports_unresolved: ContentReports.unresolved_count(scope)
    }
  end

  @doc "After activity/report mutations affecting multiple admins' nav badges."
  def broadcast_counts_for_all_admins do
    admin_user_ids =
      from(u in Storymap.Accounts.User,
        where: u.admin_level >= ^10,
        select: u.id
      )
      |> Repo.all()

    reports_unresolved = ContentReports.unresolved_count_global()

    Enum.each(admin_user_ids, fn admin_user_id ->
      scope = Scope.for_user(Repo.get!(Storymap.Accounts.User, admin_user_id))

      broadcast({
        :counts_changed,
        admin_user_id,
        %{
          activity_unread: AdminActivity.unread_count(scope),
          reports_unresolved: reports_unresolved
        }
      })
    end)

    :ok
  end
end
