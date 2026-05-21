defmodule StorymapWeb.SubMapLive.Admin do
  @moduledoc """
  Sub-map moderation (pending pins, reports, members). Requires mod role once `Storymap.SubMaps` ships.
  """
  use StorymapWeb, :live_view

  @impl true
  def mount(%{"community_url" => community_url}, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Moderate #{community_url}")
     |> assign(:community_url, community_url)}
  end
end
