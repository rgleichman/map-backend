defmodule Storymap.Pins.Query do
  @moduledoc """
  Composable queries for pins (world map vs sub-map scopes).

  `world_visible_pin?/1` is the canonical predicate for whether an approved pin
  appears on the world map. Broadcasts and authorization delegate to it via
  `Storymap.Pins.Visibility`.
  """
  import Ecto.Query
  alias Storymap.Pins.Pin

  @list_preloads [:tags, :sub_map, :outgoing_references]

  @spec list_preloads() :: [atom()]
  def list_preloads, do: @list_preloads

  @spec base() :: Ecto.Query.t()
  def base do
    from(p in Pin, preload: ^list_preloads())
  end

  @spec world_pins(Ecto.Query.t()) :: Ecto.Query.t()
  def world_pins(query \\ base()) do
    from(p in query,
      where:
        p.status == ^:approved and
          (is_nil(p.sub_map_id) or p.visible_on_world_map == true),
      order_by: [desc: p.updated_at]
    )
  end

  @spec world_visible_pin?(Pin.t()) :: boolean()
  def world_visible_pin?(%Pin{status: :approved, sub_map_id: nil}), do: true

  def world_visible_pin?(%Pin{status: :approved, visible_on_world_map: true}), do: true

  def world_visible_pin?(_), do: false

  @spec sub_map_pins(integer(), Ecto.Query.t()) :: Ecto.Query.t()
  def sub_map_pins(sub_map_id, query \\ base()) do
    from(p in query,
      where: p.sub_map_id == ^sub_map_id and p.status == ^:approved,
      order_by: [desc: p.updated_at]
    )
  end

  @spec sub_map_pins_for_mod(integer(), Ecto.Query.t()) :: Ecto.Query.t()
  def sub_map_pins_for_mod(sub_map_id, query \\ base()) do
    from(p in query,
      where:
        p.sub_map_id == ^sub_map_id and
          p.status in [^:approved, ^:pending],
      order_by: [desc: p.updated_at]
    )
  end

  @doc """
  Whether a sub-map pin event may be broadcast on the public `map:submap:*` channel.

  Matches `sub_map_pins/2` (approved only).
  """
  @spec sub_map_public_broadcast_visible?(Pin.t()) :: boolean()
  def sub_map_public_broadcast_visible?(%Pin{status: :approved}), do: true
  def sub_map_public_broadcast_visible?(_), do: false

  @doc """
  Whether a sub-map pin event may be broadcast on the moderator `map:submap:*:mod` channel.

  Matches `sub_map_pins_for_mod/2` (approved and pending).
  """
  @spec sub_map_mod_broadcast_visible?(Pin.t()) :: boolean()
  def sub_map_mod_broadcast_visible?(%Pin{status: status})
      when status in [:approved, :pending],
      do: true

  def sub_map_mod_broadcast_visible?(_), do: false

  @spec pending_pins(integer(), Ecto.Query.t()) :: Ecto.Query.t()
  def pending_pins(sub_map_id, query \\ base()) do
    from(p in query,
      where: p.sub_map_id == ^sub_map_id and p.status == ^:pending,
      order_by: [asc: p.inserted_at]
    )
  end

  @spec by_user(integer(), Ecto.Query.t()) :: Ecto.Query.t()
  def by_user(user_id, query \\ base()) do
    from(p in query,
      where: p.user_id == ^user_id,
      order_by: [desc: p.inserted_at]
    )
  end
end
