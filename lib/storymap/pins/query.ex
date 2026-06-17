defmodule Storymap.Pins.Query do
  @moduledoc """
  Composable queries for pins (world map vs sub-map scopes).
  """
  import Ecto.Query
  alias Storymap.Pins.Pin

  @approved "approved"
  @pending "pending"

  def base do
    from(p in Pin, preload: [:tags, :sub_map])
  end

  def world_pins(query \\ base()) do
    from(p in query,
      where:
        p.status == ^@approved and
          (is_nil(p.sub_map_id) or p.visible_on_world_map == true),
      order_by: [desc: p.updated_at]
    )
  end

  def sub_map_pins(sub_map_id, query \\ base()) do
    from(p in query,
      where: p.sub_map_id == ^sub_map_id and p.status == ^@approved,
      order_by: [desc: p.updated_at]
    )
  end

  def sub_map_pins_for_mod(sub_map_id, query \\ base()) do
    from(p in query,
      where:
        p.sub_map_id == ^sub_map_id and
          p.status in [^@approved, ^@pending],
      order_by: [desc: p.updated_at]
    )
  end

  def pending_pins(sub_map_id, query \\ base()) do
    from(p in query,
      where: p.sub_map_id == ^sub_map_id and p.status == ^@pending,
      order_by: [asc: p.inserted_at]
    )
  end

  def by_user(user_id, query \\ base()) do
    from(p in query,
      where: p.user_id == ^user_id,
      order_by: [desc: p.inserted_at]
    )
  end
end
