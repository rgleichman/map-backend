defmodule StorymapWeb.SubMapLive.OnMount do
  @moduledoc false
  use StorymapWeb, :html

  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps
  alias Storymap.SubMaps.Policy

  def on_mount(:load_sub_map, %{"community_url" => url}, _session, socket) do
    case SubMaps.get_by_community_url(url) do
      nil ->
        {:halt,
         socket
         |> Phoenix.LiveView.put_flash(:error, "Community not found")
         |> Phoenix.LiveView.redirect(to: ~p"/m")}

      sub_map ->
        membership = membership_for(socket, sub_map.id)
        counts = SubMaps.counts(sub_map)

        {:cont,
         socket
         |> assign(:sub_map, sub_map)
         |> assign(:sub_map_membership, membership)
         |> assign(:counts, counts)
         |> assign(:can_moderate_sub_map, can_moderate?(socket, sub_map, membership))
         |> assign(:can_edit_sub_map, can_edit?(socket, sub_map))}
    end
  end

  def on_mount(:require_moderator, _params, _session, socket) do
    if socket.assigns.can_moderate_sub_map do
      {:cont, socket}
    else
      {:halt,
       socket
       |> Phoenix.LiveView.put_flash(:error, "Moderator access required")
       |> Phoenix.LiveView.redirect(to: ~p"/m/#{socket.assigns.sub_map.community_url}/map")}
    end
  end

  def on_mount(:require_owner, _params, _session, socket) do
    sub_map = socket.assigns.sub_map

    can_edit? =
      case socket.assigns[:current_scope] do
        %Scope{user: user} -> Policy.can_edit_sub_map?(user, sub_map)
        _ -> false
      end

    if can_edit? do
      {:cont, socket}
    else
      {:halt,
       socket
       |> Phoenix.LiveView.put_flash(:error, "Community owner access required")
       |> Phoenix.LiveView.redirect(to: ~p"/m/#{sub_map.community_url}/map")}
    end
  end

  defp membership_for(socket, sub_map_id) do
    case socket.assigns[:current_scope] do
      %Scope{user: %{id: user_id}} -> SubMaps.get_membership(sub_map_id, user_id)
      _ -> nil
    end
  end

  defp can_moderate?(socket, sub_map, membership) do
    case socket.assigns[:current_scope] do
      %Scope{user: user} -> Policy.can_moderate?(user, sub_map, membership)
      _ -> false
    end
  end

  defp can_edit?(socket, sub_map) do
    case socket.assigns[:current_scope] do
      %Scope{user: user} -> Policy.can_edit_sub_map?(user, sub_map)
      _ -> false
    end
  end
end
