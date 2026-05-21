defmodule StorymapWeb.AdminLive.Activity do
  use StorymapWeb, :live_view

  alias Storymap.AdminActivity
  import StorymapWeb.Admin.EventView

  alias StorymapWeb.AdminLive.Queue
  alias StorymapWeb.AdminLive.QueueHelpers

  use Queue

  @impl true
  def mount(_params, _session, socket) do
    scope = socket.assigns.current_scope
    events = AdminActivity.list_events_for_admin(scope, limit: @page_size)
    read_event_ids = AdminActivity.read_event_ids_for_admin(scope, Enum.map(events, & &1.id))

    {:ok,
     socket
     |> assign(:page_title, "Admin activity")
     |> assign(:unread_count, AdminActivity.unread_count(scope))
     |> assign(:read_event_ids, MapSet.new(read_event_ids))
     |> assign(:activity_streamed_event_ids, MapSet.new())
     |> stream(:events, events, reset: true)
     |> track_streamed_event_ids(events)
     |> subscribe_admin_pubsub()
     |> sync_admin_nav()}
  end

  @impl true
  def handle_event("mark_read", %{"id" => id}, socket) do
    scope = socket.assigns.current_scope

    with {:ok, event_id} <- parse_id(id),
         {:ok, _} <- AdminActivity.mark_read(scope, event_id),
         {:ok, socket} <- refresh_streamed_events(socket, scope) do
      read_event_ids = MapSet.put(socket.assigns.read_event_ids, event_id)

      {:noreply,
       socket
       |> assign(:read_event_ids, read_event_ids)
       |> assign(:unread_count, AdminActivity.unread_count(scope))}
    else
      _ -> {:noreply, socket}
    end
  end

  def handle_event("mark_unread", %{"id" => id}, socket) do
    scope = socket.assigns.current_scope

    with {:ok, event_id} <- parse_id(id),
         {:ok, _} <- AdminActivity.mark_unread(scope, event_id),
         {:ok, socket} <- refresh_streamed_events(socket, scope) do
      read_event_ids = MapSet.delete(socket.assigns.read_event_ids, event_id)

      {:noreply,
       socket
       |> assign(:read_event_ids, read_event_ids)
       |> assign(:unread_count, AdminActivity.unread_count(scope))}
    else
      _ -> {:noreply, socket}
    end
  end

  def handle_event("mark_all_read", _params, socket) do
    scope = socket.assigns.current_scope
    :ok = AdminActivity.mark_all_read(scope)

    with {:ok, socket} <- refresh_streamed_events(socket, scope) do
      event_ids = MapSet.to_list(socket.assigns.activity_streamed_event_ids)

      read_event_ids =
        AdminActivity.read_event_ids_for_admin(scope, event_ids) |> MapSet.new()

      {:noreply,
       socket
       |> assign(:read_event_ids, read_event_ids)
       |> assign(:unread_count, AdminActivity.unread_count(scope))}
    else
      _ -> {:noreply, socket}
    end
  end

  @impl true
  def handle_info({:activity_event, event}, socket) do
    {:noreply,
     socket
     |> stream_insert(:events, event, at: 0)
     |> track_streamed_event_ids([event])}
  end

  def handle_info({:activity_reads_changed, admin_user_id}, socket) do
    if admin_user_id == socket.assigns.current_scope.user.id do
      scope = socket.assigns.current_scope

      with {:ok, socket} <- refresh_streamed_events(socket, scope) do
        {:noreply,
         socket
         |> QueueHelpers.refresh_read_event_ids(scope, :activity_streamed_event_ids)
         |> assign(:unread_count, AdminActivity.unread_count(scope))}
      else
        _ -> {:noreply, socket}
      end
    else
      {:noreply, socket}
    end
  end

  def handle_info({:counts_changed, admin_user_id, counts}, socket) do
    {:noreply,
     QueueHelpers.apply_counts_changed(
       socket,
       admin_user_id,
       counts,
       :unread_count,
       :activity_unread
     )}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  defp track_streamed_event_ids(socket, events) do
    ids =
      Enum.reduce(events, socket.assigns.activity_streamed_event_ids, fn event, acc ->
        MapSet.put(acc, event.id)
      end)

    assign(socket, :activity_streamed_event_ids, ids)
  end

  defp refresh_streamed_events(socket, scope) do
    events = AdminActivity.list_events_for_admin(scope, limit: @page_size)

    {:ok,
     socket
     |> stream(:events, events, reset: true)
     |> track_streamed_event_ids(events)}
  end
end
