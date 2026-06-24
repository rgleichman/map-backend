defmodule Storymap.Pins.Visibility do
  @moduledoc """
  World-map visibility rules for pins.

  The canonical visibility predicate lives in `Storymap.Pins.Query.world_visible_pin?/1`
  (used by list queries). This module re-exports it for broadcasts and authorization,
  and centralizes `visible_on_world_map` sanitization for sub-map pin create/update.
  """

  alias Storymap.Accounts.User
  alias Storymap.Pins.{Pin, Query}
  alias Storymap.SubMaps.{Membership, Policy, SubMap}

  @spec world_visible?(Pin.t()) :: boolean()
  def world_visible?(%Pin{} = pin), do: Query.world_visible_pin?(pin)

  @doc """
  Resolves `visible_on_world_map` for a sub-map pin.

  When the actor may set the flag and `requested` is a boolean, returns `requested`.
  Otherwise returns `fallback` (the pin's current value on update, or the sub-map
  promotion default on create).
  """
  @spec resolve_visible_on_world_map(
          SubMap.t(),
          User.t() | nil,
          Membership.t() | nil,
          boolean() | nil,
          boolean()
        ) :: boolean()
  def resolve_visible_on_world_map(sub_map, user, membership, requested, fallback)
      when is_boolean(fallback) do
    if Policy.can_set_visible_on_world?(sub_map, user, membership) and is_boolean(requested) do
      requested
    else
      fallback
    end
  end

  @doc """
  Sanitizes `visible_on_world_map` in update attrs when the key is present.
  """
  @spec sanitize_attrs_visible_on_world_map(
          map(),
          SubMap.t(),
          Pin.t(),
          User.t() | nil,
          Membership.t() | nil
        ) :: map()
  def sanitize_attrs_visible_on_world_map(
        attrs,
        %SubMap{} = sub_map,
        %Pin{} = pin,
        user,
        membership
      ) do
    case Map.get(attrs, "visible_on_world_map") do
      v when is_boolean(v) ->
        visible =
          resolve_visible_on_world_map(sub_map, user, membership, v, pin.visible_on_world_map)

        Map.put(attrs, "visible_on_world_map", visible)

      _ ->
        attrs
    end
  end

  @spec sanitize_attrs_visible_on_world_map(map(), any(), any(), any(), any()) :: map()
  def sanitize_attrs_visible_on_world_map(attrs, _, _, _, _), do: attrs

  @doc """
  Resolves initial `visible_on_world_map` when creating a pin in a sub-map.
  """
  @spec initial_visible_on_world_map(
          map(),
          SubMap.t(),
          User.t() | nil,
          Membership.t() | nil
        ) :: boolean()
  def initial_visible_on_world_map(attrs, %SubMap{} = sub_map, user, membership) do
    resolve_visible_on_world_map(
      sub_map,
      user,
      membership,
      attrs["visible_on_world_map"],
      Policy.promotion_default_visible?(sub_map)
    )
  end
end
