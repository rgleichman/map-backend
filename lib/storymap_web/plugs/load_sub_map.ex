defmodule StorymapWeb.Plugs.LoadSubMap do
  @moduledoc """
  Loads a sub-map by `community_url` route param and optional membership for the current user.
  """
  import Plug.Conn
  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps

  @spec init(keyword()) :: keyword()
  def init(opts), do: opts

  @spec call(Plug.Conn.t(), keyword()) :: Plug.Conn.t()
  def call(conn, _opts) do
    community_url = conn.params["community_url"]

    case SubMaps.get_by_community_url(community_url) do
      nil ->
        conn
        |> put_status(:not_found)
        |> Phoenix.Controller.put_view(html: StorymapWeb.ErrorHTML)
        |> Phoenix.Controller.render(:"404")
        |> halt()

      sub_map ->
        membership = membership_for(conn, sub_map.id)
        can_moderate = mod?(conn, sub_map, membership)

        conn
        |> assign(:sub_map, sub_map)
        |> assign(:sub_map_membership, membership)
        |> assign(:can_moderate_sub_map, can_moderate)
    end
  end

  defp membership_for(conn, sub_map_id) do
    case conn.assigns[:current_scope] do
      %Scope{user: %{id: user_id}} ->
        SubMaps.get_membership(sub_map_id, user_id)

      _ ->
        nil
    end
  end

  defp mod?(conn, sub_map, membership) do
    case conn.assigns[:current_scope] do
      %Scope{user: user} ->
        Storymap.SubMaps.Policy.can_moderate?(user, sub_map, membership)

      _ ->
        false
    end
  end
end
