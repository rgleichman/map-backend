defmodule Storymap.Pins.Pin do
  use Ecto.Schema
  import Ecto.Changeset

  @derive {Jason.Encoder,
           only: [
             :id,
             :title,
             :latitude,
             :longitude,
             :pin_type,
             :inserted_at,
             :updated_at,
             :description,
             :icon_url,
             :schedule_rrule,
             :schedule_timezone
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
    # For pin_type "scheduled": iCal RRULE (e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=15;BYMINUTE=0)
    field :schedule_rrule, :string

    # IANA timezone for schedule (e.g. America/Los_Angeles). Interpret BYHOUR/BYMINUTE in this zone.
    field :schedule_timezone, :string
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
        :pin_type,
        :schedule_rrule
      ])
      |> validate_required([:title, :latitude, :longitude, :pin_type])
      |> validate_inclusion(:pin_type, ["one_time", "scheduled", "food_bank"])

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

    changeset =
      case {Ecto.Changeset.get_change(changeset, :latitude) || pin.latitude,
            Ecto.Changeset.get_change(changeset, :longitude) || pin.longitude} do
        {lat, lng}
        when is_number(lat) and lat >= -90 and lat <= 90 and
               is_number(lng) and lng >= -180 and lng <= 180 ->
          case TzWorld.timezone_at({lng, lat}) do
            {:ok, tz} -> put_change(changeset, :schedule_timezone, tz)
            {:error, :time_zone_not_found} -> put_change(changeset, :schedule_timezone, nil)
          end

        _ ->
          changeset
      end

    changeset
    |> validate_required([:user_id])
    |> foreign_key_constraint(:user_id)
  end
end
