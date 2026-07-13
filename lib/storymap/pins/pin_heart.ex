defmodule Storymap.Pins.PinHeart do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  @type t :: %__MODULE__{
          id: integer() | nil,
          user_id: integer() | nil,
          pin_id: integer() | nil,
          inserted_at: DateTime.t() | nil
        }

  schema "pin_hearts" do
    belongs_to :user, Storymap.Accounts.User
    belongs_to :pin, Storymap.Pins.Pin

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(%__MODULE__{} = heart, attrs) do
    heart
    |> cast(attrs, [:pin_id])
    |> validate_required([:pin_id])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:pin_id)
    |> unique_constraint([:user_id, :pin_id])
  end
end
