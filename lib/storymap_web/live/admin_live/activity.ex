defmodule StorymapWeb.AdminLive.Activity do
  use StorymapWeb, :live_view

  alias Storymap.AdminActivity

  @page_size 50

  @impl true
  def mount(_params, _session, socket) do
    scope = socket.assigns.current_scope

    events = AdminActivity.list_events_for_admin(scope, limit: @page_size)
    unread_count = AdminActivity.unread_count(scope)
    read_event_ids = AdminActivity.read_event_ids_for_admin(scope, Enum.map(events, & &1.id))
    read_event_ids_set = MapSet.new(read_event_ids)
    streamed_event_ids = events |> Enum.map(& &1.id) |> MapSet.new()

    if connected?(socket) do
      Phoenix.PubSub.subscribe(Storymap.PubSub, AdminActivity.pubsub_topic())
    end

    {:ok,
     socket
     |> assign(:page_title, "Admin · Activity")
     |> assign(:unread_count, unread_count)
     |> assign(:read_event_ids, read_event_ids_set)
     |> assign(:activity_streamed_event_ids, streamed_event_ids)
     |> stream(:events, events)}
  end

  @impl true
  def handle_info({:admin_activity_event, event}, socket) do
    if MapSet.member?(socket.assigns.activity_streamed_event_ids, event.id) do
      {:noreply, socket}
    else
      socket =
        socket
        |> assign(
          :activity_streamed_event_ids,
          MapSet.put(socket.assigns.activity_streamed_event_ids, event.id)
        )
        |> assign(:unread_count, socket.assigns.unread_count + 1)
        |> assign(:read_event_ids, socket.assigns.read_event_ids)
        |> stream_insert(:events, event, at: 0)

      {:noreply, socket}
    end
  end

  @impl true
  def handle_event("mark_read", %{"id" => id}, socket) do
    case parse_event_id(id) do
      {:ok, event_id} ->
        scope = socket.assigns.current_scope

        case AdminActivity.mark_read(scope, event_id) do
          {:ok, _} ->
            read_event_ids = MapSet.put(socket.assigns.read_event_ids, event_id)
            event = AdminActivity.get_event!(scope, event_id)

            {:noreply,
             socket
             |> assign(:read_event_ids, read_event_ids)
             |> assign(:unread_count, max(socket.assigns.unread_count - 1, 0))
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
    case parse_event_id(id) do
      {:ok, event_id} ->
        scope = socket.assigns.current_scope

        case AdminActivity.mark_unread(scope, event_id) do
          {:ok, :cleared} ->
            read_event_ids = MapSet.delete(socket.assigns.read_event_ids, event_id)
            event = AdminActivity.get_event!(scope, event_id)

            {:noreply,
             socket
             |> assign(:read_event_ids, read_event_ids)
             |> assign(:unread_count, socket.assigns.unread_count + 1)
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

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Activity</h1>
            <p class="text-sm opacity-80 mt-1">
              Admin-only log of app activity.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <div class="badge badge-neutral">
              Unread: {@unread_count}
            </div>
            <button
              id="admin-activity-mark-all-read"
              type="button"
              class="btn btn-sm btn-ghost"
              phx-click="mark_all_read"
              disabled={@unread_count == 0}
            >
              Mark all read
            </button>
          </div>
        </div>

        <div class="mt-6">
          <div id="admin-activity-events" phx-update="stream" class="space-y-3">
            <div id="admin-activity-empty" class="hidden only:block opacity-70">
              No activity yet.
            </div>

            <div :for={{id, event} <- @streams.events} id={id}>
              <% read? = MapSet.member?(@read_event_ids, event.id) %>
              <div class={[
                "rounded-xl border p-4 shadow-sm transition-colors",
                read? && "bg-success/10 border-success/30",
                !read? && "bg-base-100 border-base-300"
              ]}>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="font-medium truncate">
                      {event.type}
                    </div>
                    <div class="text-sm opacity-80 mt-1">
                      <span class="font-mono text-xs opacity-80">
                        #{event.id}
                      </span>
                      <span class="mx-2 opacity-50">·</span>
                      <time
                        class="admin-local-time"
                        data-utc={DateTime.to_iso8601(event.inserted_at)}
                        datetime={DateTime.to_iso8601(event.inserted_at)}
                        title="UTC timestamp"
                      >
                        {format_ts(event.inserted_at)}
                      </time>
                      <%= if event.actor_user_id do %>
                        <span class="mx-2 opacity-50">·</span>
                        <span>actor #{event.actor_user_id}</span>
                      <% end %>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn btn-xs btn-ghost"
                    phx-click={if(read?, do: "mark_unread", else: "mark_read")}
                    phx-value-id={event.id}
                  >
                    <%= if read? do %>
                      Mark unread
                    <% else %>
                      Mark read
                    <% end %>
                  </button>
                </div>

                <%= if pin_event?(event.type) do %>
                  <% title = event.metadata["title"]
                  pin_id_meta = event.metadata["pin_id"] %>
                  <div class="mt-2 text-sm font-medium min-w-0">
                    <span
                      class="block truncate"
                      title={if(is_binary(title) and title != "", do: title, else: nil)}
                    >
                      <%= cond do %>
                        <% is_binary(title) and title != "" -> %>
                          Pin: {title}
                        <% pin_id_meta not in [nil, ""] -> %>
                          Pin ##{pin_id_meta}
                        <% true -> %>
                      <% end %>
                    </span>
                  </div>
                <% end %>

                <%= if pin_id = event.metadata["pin_id"] do %>
                  <div class="mt-3">
                    <.link
                      navigate={~p"/map?pin=#{pin_id}"}
                      class="link link-primary text-sm inline-flex items-center gap-1"
                    >
                      <.icon name="hero-map-pin" class="size-4" /> View pin #{pin_id}
                    </.link>
                  </div>
                <% end %>

                <%= if event.type == "pin_updated" do %>
                  <%= if diff = event.metadata["diff"] do %>
                    <%= if changes = diff["changes"] do %>
                      <%= if map_size(changes) > 0 do %>
                        <div class="mt-3">
                          <div class="text-xs font-medium opacity-80">Changes</div>
                          <ul class="mt-2 space-y-2 text-xs">
                            <li :for={{field, change} <- Enum.sort_by(changes, fn {k, _v} -> k end)}>
                              <div class="font-mono opacity-70">{field}</div>
                              <div class="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <div class="rounded-lg bg-base-200/60 p-2">
                                  <div class="opacity-60">from</div>
                                  <pre class="whitespace-pre-wrap break-words">{Jason.encode!(change["from"], pretty: true)}</pre>
                                </div>
                                <div class="rounded-lg bg-base-200/60 p-2">
                                  <div class="opacity-60">to</div>
                                  <pre class="whitespace-pre-wrap break-words">{Jason.encode!(change["to"], pretty: true)}</pre>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      <% end %>
                    <% end %>
                  <% end %>
                <% end %>

                <%= if event.metadata != %{} and not pin_event?(event.type) do %>
                  <div class="mt-3 text-sm">
                    <pre class="whitespace-pre-wrap break-words rounded-lg bg-base-200/60 p-3 text-xs">{Jason.encode!(event.metadata, pretty: true)}</pre>
                  </div>
                <% end %>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end

  defp pin_event?(type) when is_binary(type), do: String.starts_with?(type, "pin_")
  defp pin_event?(_), do: false

  defp format_ts(nil), do: ""

  defp format_ts(%DateTime{} = dt) do
    dt
    |> DateTime.shift_zone!("Etc/UTC")
    |> Calendar.strftime("%Y-%m-%d %H:%M:%S UTC")
  end

  defp parse_event_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {event_id, ""} -> {:ok, event_id}
      _ -> :error
    end
  end

  defp parse_event_id(id) when is_integer(id), do: {:ok, id}
  defp parse_event_id(_), do: :error
end
