defmodule StorymapWeb.SubMapJSON do
  @moduledoc false
  alias Storymap.SubMaps
  alias Storymap.SubMaps.{Membership, SubMap}
  alias StorymapWeb.PinJSON

  def index(%{sub_maps: sub_maps}) do
    %{data: Enum.map(sub_maps, &data/1)}
  end

  def show(%{sub_map: sub_map} = assigns) do
    user = Map.get(assigns, :current_user)
    membership = Map.get(assigns, :membership)
    counts = Map.get(assigns, :counts) || SubMaps.counts(sub_map)

    %{
      data:
        data(sub_map)
        |> Map.merge(viewer_fields(user, membership, assigns))
        |> Map.merge(%{
          pin_count: counts.pin_count,
          member_count: counts.member_count,
          pending_count: counts.pending_count
        })
    }
  end

  def pins(assigns) do
    PinJSON.index(assigns)
  end

  defp data(%SubMap{} = sub_map) do
    %{
      community_url: sub_map.community_url,
      name: sub_map.name,
      description: sub_map.description,
      rules: sub_map.rules,
      contribution_mode: sub_map.contribution_mode,
      promote_to_world_default: sub_map.promote_to_world_default,
      visibility: sub_map.visibility,
      bounds: sub_map.bounds,
      settings: sub_map.settings || %{},
      inserted_at: sub_map.inserted_at,
      updated_at: sub_map.updated_at,
      pin_count: sub_map.pin_count,
      member_count: sub_map.member_count
    }
  end

  defp viewer_fields(nil, _, _),
    do: %{membership: nil, can_moderate: false, can_post: false, can_edit: false}

  defp viewer_fields(user, membership, assigns) do
    sub_map = assigns.sub_map

    %{
      membership: membership_data(membership),
      can_moderate: Map.get(assigns, :can_moderate, false),
      can_post: Storymap.SubMaps.Policy.can_post?(user, sub_map, membership),
      can_edit: Storymap.SubMaps.Policy.can_edit_sub_map?(user, sub_map)
    }
  end

  defp membership_data(nil), do: nil

  defp membership_data(%Membership{} = m) do
    %{role: m.role, status: m.status}
  end
end
