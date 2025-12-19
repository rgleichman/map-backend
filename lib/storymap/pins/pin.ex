defmodule Storymap.Pins.Pin do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder, only: [:id, :user_id, :title, :latitude, :longitude, :inserted_at, :updated_at, :description, :icon_url]}

  schema "pins" do
    belongs_to :user, Storymap.Accounts.User
    field :title, :string
    field :latitude, :float
    field :longitude, :float
    field :description, :string # description of the pin in markdown format
    field :icon_url, :string # icon image url for the pin
    many_to_many :tags, Storymap.Tags.Tag, join_through: "pin_tags", on_replace: :delete

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(pin, attrs) do
  pin
  |> cast(attrs, [:title, :latitude, :longitude, :user_id, :description, :icon_url])
  |> validate_required([:title, :latitude, :longitude, :user_id])
  |> foreign_key_constraint(:user_id)
  end
end
