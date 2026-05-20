defmodule StorymapWeb.AdminLive.Activity do
  use StorymapWeb, :live_view
  use StorymapWeb.AdminLive.Queue

  alias Storymap.AdminActivity

  import StorymapWeb.Admin.EventView, only: [activity_card: 1]

  @impl true
  def mount(_params, _session, socket) do
    scope = socket.assigns.current_scope

    events = AdminActivity.list_events_for_admin(scope, limit: @page_size)
    unread_count = AdminActivity.unread_count(scope)
    read_event_ids = AdminActivity.read_event_ids_for_admin(scope, Enum.map(events, & &1.id))
    read_event_ids_set = MapSet.new(read_event_ids)
    streamed_event_ids = events |> Enum.map(& &1.id) |> MapSet.new()

    {:ok,
     socket
     |> assign(:page_title, "Admin · Activity")
     |> assign(:unread_count, unread_count)
     |> assign(:read_event_ids, read_event_ids_set)
     |> assign(:activity_streamed_event_ids, streamed_event_ids)
     |> stream(:events, events)
     |> subscribe_admin_pubsub()}
  end

  @impl true
  def handle_info({:activity_event, event}, socket) do
    if MapSet.member?(socket.assigns.activity_streamed_event_ids, event.id) do
      {:noreply, socket}
    else
      scope = socket.assigns.current_scope

      {:noreply,
       socket
       |> assign(
         :activity_streamed_event_ids,
         MapSet.put(socket.assigns.activity_streamed_event_ids, event.id)
       )
       |> assign(:unread_count, AdminActivity.unread_count(scope))
       |> stream_insert(:events, event, at: 0)}
    end
  end

  def handle_info({:activity_reads_changed, admin_user_id}, socket) do
    if socket.assigns.current_scope.user.id == admin_user_id do
      scope = socket.assigns.current_scope

      {:noreply, assign(socket, :unread_count, AdminActivity.unread_count(scope))}
    else
      {:noreply, socket}
    end
  end

  def handle_info({:counts_changed, counts}, socket) do
    {:noreply, assign(socket, :unread_count, counts.activity_unread)}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def handle_event("mark_read", %{"id" => id}, socket) do
    case parse_id(id) do
      {:ok, event_id} ->
        scope = socket.assigns.current_scope

        case AdminActivity.mark_read(scope, event_id) do
          {:ok, _} ->
            read_event_ids = MapSet.put(socket.assigns.read_event_ids, event_id)
            event = AdminActivity.get_event!(scope, event_id)

            {:noreply,
             socket
             |> assign(:read_event_ids, read_event_ids)
             |> assign(:unread_count, AdminActivity.unread_count(scope))
             |> stream_insert(:events, event)}

          {:error, :unauthorized} ->
            {:noreply,
             socket
             |> put_flash(:error, "You are not authorized to mark activity as read.")}

          {:error, _} ->
            {:noreply,
             socket
             |> put_flash(:error, "Could not mark activity as read.")}
        end

      :error ->
        {:noreply, put_flash(socket, :error, "Invalid activity event id.")}
    end
  end

  @impl true
  def handle_event("mark_unread", %{"id" => id}, socket) do
    case parse_id(id) do
      {:ok, event_id} ->
        scope = socket.assigns.current_scope

        case AdminActivity.mark_unread(scope, event_id) do
          {:ok, :cleared} ->
            read_event_ids = MapSet.delete(socket.assigns.read_event_ids, event_id)
            event = AdminActivity.get_event!(scope, event_id)

            {:noreply,
             socket
             |> assign(:read_event_ids, read_event_ids)
             |> assign(:unread_count, AdminActivity.unread_count(scope))
             |> stream_insert(:events, event)}

          {:ok, :noop} ->
            {:noreply, socket}

          {:error, :unauthorized} ->
            {:noreply,
             socket
             |> put_flash(:error, "You are not authorized to mark activity as unread.")}
        end

      :error ->
        {:noreply, put_flash(socket, :error, "Invalid activity event id.")}
    end
  end

  @impl true
  def handle_event("mark_all_read", _params, socket) do
    case AdminActivity.mark_all_read(socket.assigns.current_scope) do
      :ok ->
        scope = socket.assigns.current_scope
        events = AdminActivity.list_events_for_admin(scope, limit: @page_size)

        read_event_ids =
          AdminActivity.read_event_ids_for_admin(scope, Enum.map(events, & &1.id)) |> MapSet.new()

        {:noreply,
         socket
         |> assign(:read_event_ids, read_event_ids)
         |> assign(:unread_count, 0)
         |> stream(:events, events, reset: true)}

      {:error, :unauthorized} ->
        {:noreply,
         socket
         |> put_flash(:error, "You are not authorized to mark activity as read.")}
    end
  end
end
