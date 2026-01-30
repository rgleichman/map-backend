defmodule Storymap.Pins.Pin do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :title,
             :latitude,
             :longitude,
             :inserted_at,
             :updated_at,
             :description,
             :icon_url
           ]}

  schema "pins" do
    belongs_to :user, Storymap.Accounts.User
    field :title, :string
    field :latitude, :float
    field :longitude, :float
    # description of the pin in markdown format
    field :description, :string
    # icon image url for the pin
    field :icon_url, :string
    field :start_time, :utc_datetime
    field :end_time, :utc_datetime
    field :pin_type, :string
    many_to_many :tags, Storymap.Tags.Tag, join_through: "pin_tags", on_replace: :delete

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(pin, attrs) do
    changeset =
      pin
      |> cast(attrs, [
        :title,
        :latitude,
        :longitude,
        :description,
        :icon_url,
        :start_time,
        :end_time,
        :pin_type
      ])
      |> validate_required([:title, :latitude, :longitude])

    # Set user_id programmatically only for new pins (creation)
    # This prevents users from changing ownership via user input during updates
    changeset =
      if is_nil(pin.id) do
        case Map.get(attrs, "user_id") do
          nil -> changeset
          user_id -> put_change(changeset, :user_id, user_id)
        end
      else
        changeset
      end

    changeset
    |> validate_required([:user_id])
    |> foreign_key_constraint(:user_id)
  end
end
