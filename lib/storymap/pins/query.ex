defmodule Storymap.Pins.Query do
  @moduledoc """
  Composable queries for pins (world map vs sub-map scopes).
  """
  import Ecto.Query
  alias Storymap.Pins.Pin

  @spec base() :: Ecto.Query.t()
  def base do
    from(p in Pin, preload: [:tags, :sub_map])
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
