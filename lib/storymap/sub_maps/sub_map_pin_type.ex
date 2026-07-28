defmodule Storymap.SubMaps.SubMapPinType do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.PinTypes.PinType
  alias Storymap.SubMaps.SubMap

  @type t :: %__MODULE__{
          id: integer() | nil,
          sub_map_id: integer() | nil,
          pin_type_id: integer() | nil
        }

  schema "sub_map_pin_types" do
    belongs_to :sub_map, SubMap
    belongs_to :pin_type, PinType
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(row, attrs) do
    row
    |> cast(attrs, [:sub_map_id, :pin_type_id])
    |> validate_required([:sub_map_id, :pin_type_id])
    |> unique_constraint([:sub_map_id, :pin_type_id])
    |> foreign_key_constraint(:sub_map_id)
    |> foreign_key_constraint(:pin_type_id)
  end
end
