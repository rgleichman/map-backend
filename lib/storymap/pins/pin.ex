defmodule Storymap.Pins.Pin do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :user_id, :title, :latitude, :longitude, :inserted_at, :updated_at]}

  schema "pins" do
    belongs_to :user, Storymap.Accounts.User
    field :title, :string
    field :latitude, :float
    field :longitude, :float

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(pin, attrs) do
    pin
    |> cast(attrs, [:title, :latitude, :longitude, :user_id])
    |> validate_required([:title, :latitude, :longitude, :user_id])
    |> foreign_key_constraint(:user_id)
  end
end
