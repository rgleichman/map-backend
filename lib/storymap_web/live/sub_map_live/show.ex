defmodule StorymapWeb.SubMapLive.Show do
  @moduledoc """
  Sub-map community home page (rules, stats, CTAs). Loads from `Storymap.SubMaps` once implemented.
  """
  use StorymapWeb, :live_view

  @impl true
  def mount(%{"community_url" => community_url}, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, community_url)
     |> assign(:community_url, community_url)
     |> assign(:sub_map, nil)}
  end
end
