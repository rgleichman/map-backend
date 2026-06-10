defmodule StorymapWeb.SubMapLive.Admin do
  @moduledoc "Community moderation queue."
  use StorymapWeb, :live_view

  alias Storymap.SubMaps

  on_mount {StorymapWeb.SubMapLive.OnMount, :load_sub_map}
  on_mount {StorymapWeb.SubMapLive.OnMount, :require_moderator}

  @impl true
  def mount(_params, _session, socket) do
    pending = SubMaps.pending_pins(socket.assigns.sub_map)

    {:ok,
     socket
     |> assign(:page_title, "Moderate #{socket.assigns.sub_map.name}")
     |> stream(:pending_pins, pending, reset: true)}
  end

  @impl true
  def handle_event("approve", %{"id" => id}, socket) do
    case SubMaps.approve_pin(socket.assigns.current_scope, socket.assigns.sub_map, id) do
      {:ok, pin} ->
        StorymapWeb.PinBroadcast.broadcast_pin_event(pin, :updated)

        {:noreply,
         socket
         |> stream_delete(:pending_pins, pin)
         |> put_flash(:info, "Pin approved")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Could not approve")}
    end
  end

  def handle_event("reject", %{"id" => id}, socket) do
    case SubMaps.reject_pin(socket.assigns.current_scope, socket.assigns.sub_map, id) do
      {:ok, pin} ->
        StorymapWeb.PinBroadcast.broadcast_pin_event(pin, :updated)

        {:noreply,
         socket
         |> stream_delete(:pending_pins, pin)
         |> put_flash(:info, "Pin rejected")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Could not reject")}
    end
  end
end
