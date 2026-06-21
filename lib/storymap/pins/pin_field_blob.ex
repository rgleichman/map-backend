defmodule Storymap.Pins.PinFieldBlob do
  @moduledoc false

  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{
          id: integer() | nil,
          pin_id: integer() | nil,
          field_key: String.t() | nil,
          type: String.t() | nil,
          format: String.t() | nil,
          version: integer() | nil,
          payload: String.t() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "pin_field_blobs" do
    belongs_to :pin, Storymap.Pins.Pin

    field :field_key, :string
    field :type, :string
    field :format, :string, default: "music/v1"
    field :version, :integer, default: 1
    field :payload, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(blob, attrs) do
    blob
    |> cast(attrs, [:pin_id, :field_key, :type, :format, :version, :payload])
    |> validate_required([:pin_id, :field_key, :type, :format, :version, :payload])
    |> validate_length(:field_key, max: 64)
    |> validate_length(:type, max: 32)
    |> validate_length(:format, max: 32)
    |> validate_number(:version, greater_than_or_equal_to: 1)
    |> validate_payload_size()
    |> unique_constraint([:pin_id, :field_key, :type],
      name: :pin_field_blobs_pin_field_type_index
    )
    |> foreign_key_constraint(:pin_id)
  end

  defp validate_payload_size(changeset) do
    # Keep in sync with DB check constraint `pin_field_blobs_payload_size`.
    max_bytes = 262_144

    validate_change(changeset, :payload, fn :payload, payload ->
      if is_binary(payload) and byte_size(payload) <= max_bytes do
        []
      else
        [payload: "is too large (max #{max_bytes} bytes)"]
      end
    end)
  end
end
