defmodule StorymapWeb.MapChannel do
  use Phoenix.Channel

  alias Storymap.Accounts
  alias Storymap.SubMaps
  alias Storymap.SubMaps.Policy

  def join("map:world", _message, socket) do
    {:ok, socket}
  end

  def join("map:submap:" <> rest, _message, socket) do
    if String.ends_with?(rest, ":mod") do
      community_url = String.trim_trailing(rest, ":mod")
      join_mod_channel(community_url, socket)
    else
      join_public_submap_channel(rest, socket)
    end
  end

  defp join_public_submap_channel(community_url, socket) do
    case SubMaps.get_by_community_url(community_url) do
      %{} = sub_map ->
        {:ok, socket |> assign(:community_url, community_url) |> assign(:sub_map_id, sub_map.id)}

      nil ->
        {:error, %{reason: "community not found"}}
    end
  end

  defp join_mod_channel(community_url, socket) do
    with user_id when not is_nil(user_id) <- socket.assigns[:user_id],
         %{} = user <- Accounts.get_user(user_id),
         %{} = sub_map <- SubMaps.get_by_community_url(community_url),
         membership <- SubMaps.get_membership(sub_map.id, user.id),
         true <- Policy.can_moderate?(user, sub_map, membership) do
      {:ok,
       socket
       |> assign(:community_url, community_url)
       |> assign(:sub_map_id, sub_map.id)
       |> assign(:moderator_channel?, true)}
    else
      _ -> {:error, %{reason: "unauthorized"}}
    end
  end
end
