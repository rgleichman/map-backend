defmodule StorymapWeb.SubMapLive.Index do
  @moduledoc "Browse and search public communities."
  use StorymapWeb, :live_view

  alias Storymap.SubMaps

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Communities")
     |> assign(:search_query, "")
     |> load_sub_maps()}
  end

  @impl true
  def handle_event("search", %{"q" => q}, socket) do
    {:noreply, socket |> assign(:search_query, String.trim(q)) |> load_sub_maps()}
  end

  def handle_event("search", _params, socket) do
    {:noreply, socket |> assign(:search_query, "") |> load_sub_maps()}
  end

  defp load_sub_maps(socket) do
    sub_maps = SubMaps.list_public(q: socket.assigns.search_query)
    assign(socket, :sub_maps, sub_maps)
  end
end
