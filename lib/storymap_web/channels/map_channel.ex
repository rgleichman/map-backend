defmodule StorymapWeb.MapChannel do
  use Phoenix.Channel

  alias Storymap.SubMaps

  def join("map:world", _message, socket) do
    {:ok, socket}
  end

  def join("map:submap:" <> community_url, _message, socket) do
    case SubMaps.get_by_community_url(community_url) do
      %{} = sub_map ->
        {:ok, socket |> assign(:community_url, community_url) |> assign(:sub_map_id, sub_map.id)}

      nil ->
        {:error, %{reason: "community not found"}}
    end
  end
end
