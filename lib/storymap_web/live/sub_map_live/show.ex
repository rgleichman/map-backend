defmodule StorymapWeb.SubMapLive.Show do
  @moduledoc "Community home page."
  use StorymapWeb, :live_view

  alias Storymap.SubMaps

  on_mount {StorymapWeb.SubMapLive.OnMount, :load_sub_map}

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :page_title, socket.assigns.sub_map.name)}
  end

  @impl true
  def handle_event("join", _params, socket) do
    case SubMaps.join(socket.assigns.current_scope, socket.assigns.sub_map) do
      {:ok, membership} ->
        {:noreply,
         socket
         |> assign(:sub_map_membership, membership)
         |> put_flash(:info, "Joined community")}

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
         |> put_flash(:info, "Left community")}

      {:error, :owner_cannot_leave} ->
        {:noreply, put_flash(socket, :error, "Owners cannot leave; transfer ownership first")}

      {:error, _} ->
        {:noreply, put_flash(socket, :error, "Could not leave")}
    end
  end
end
