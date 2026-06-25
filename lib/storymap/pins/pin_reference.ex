defmodule Storymap.Pins.PinReference do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  @kinds [:explicit, :text]

  @type kind :: :explicit | :text

  @type t :: %__MODULE__{
          id: integer() | nil,
          source_pin_id: integer() | nil,
          target_pin_id: integer() | nil,
          kind: kind(),
          source_field: String.t() | nil,
          position: integer() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "pin_references" do
    belongs_to :source_pin, Storymap.Pins.Pin, foreign_key: :source_pin_id
    belongs_to :target_pin, Storymap.Pins.Pin, foreign_key: :target_pin_id
    field :kind, Ecto.Enum, values: @kinds
    field :source_field, :string
    field :position, :integer

    timestamps(type: :utc_datetime)
  end

  @spec changeset(%__MODULE__{}, map()) :: Ecto.Changeset.t()
  def changeset(ref, attrs) do
    ref
    |> cast(attrs, [:source_pin_id, :target_pin_id, :kind, :source_field, :position])
    |> validate_required([:source_pin_id, :target_pin_id, :kind])
    |> validate_no_self_link()
    |> foreign_key_constraint(:source_pin_id)
    |> foreign_key_constraint(:target_pin_id)
    |> unique_constraint([:source_pin_id, :target_pin_id])
  end

  defp validate_no_self_link(changeset) do
    source_id = get_field(changeset, :source_pin_id)
    target_id = get_field(changeset, :target_pin_id)

    if source_id && target_id && source_id == target_id do
      add_error(changeset, :target_pin_id, "cannot link a pin to itself")
    else
      changeset
    end
  end
end
