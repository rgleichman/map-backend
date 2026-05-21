defmodule StorymapWeb.SubMapLive.Index do
  @moduledoc """
  Browse and search public sub-maps. Data loads from `Storymap.SubMaps` once implemented;
  until then shows an empty state with design doc link.
  """
  use StorymapWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Communities")
     |> assign(:search_query, "")
     |> assign(:sub_maps, [])}
  end

  @impl true
  def handle_event("search", %{"q" => q}, socket) do
    {:noreply, assign(socket, :search_query, String.trim(q))}
  end

  def handle_event("search", _params, socket) do
    {:noreply, assign(socket, :search_query, "")}
  end
end
