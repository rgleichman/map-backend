defmodule StorymapWeb.SubMapLive.Show do
  @moduledoc "Community home page."
  use StorymapWeb, :live_view

  alias Storymap.SubMaps
  alias StorymapWeb.GardenCopy

  on_mount {StorymapWeb.SubMapLive.OnMount, :load_sub_map}

  @impl true
  @spec mount(map(), map(), Phoenix.LiveView.Socket.t()) :: {:ok, Phoenix.LiveView.Socket.t()}
  def mount(_params, _session, socket) do
    path = ~p"/g/#{socket.assigns.sub_map.community_url}/map"

    socket =
      if connected?(socket) do
        push_navigate(socket, to: path)
      else
        redirect(socket, to: path)
      end

    {:ok, socket}
  end

  @impl true
  def handle_event("join", _params, socket) do
    case SubMaps.join(socket.assigns.current_scope, socket.assigns.sub_map) do
      {:ok, membership} ->
        {:noreply,
         socket
         |> assign(:sub_map_membership, membership)
         |> put_flash(:info, GardenCopy.joined_garden())}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Could not join")}
    end
  end

  def handle_event("leave", _params, socket) do
    case SubMaps.leave(socket.assigns.current_scope, socket.assigns.sub_map) do
      {:ok, _} ->
        {:noreply,
         socket
         |> assign(:sub_map_membership, nil)
         |> put_flash(:info, GardenCopy.left_garden())}

      {:error, :owner_cannot_leave} ->
        {:noreply, put_flash(socket, :error, "Owners cannot leave; transfer ownership first")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Could not leave")}
    end
  end
end
