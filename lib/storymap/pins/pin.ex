defmodule Storymap.Pins.Pin do
  @moduledoc """
  Pin schema. Any new schema field that should appear in JSON must be added to
  `@public_json_fields` (and must not be user_id, for privacy).
  """
  use Ecto.Schema
  import Ecto.Changeset

  # Single source of truth for JSON-safe fields (schema fields minus user_id).
  # Used by @derive and by PinJSON so encode and API stay in sync.
  # Associations (e.g. tags) are not included—PinJSON adds those as view-only keys.
  @public_json_fields [
    :id,
    :title,
    :latitude,
    :longitude,
    :pin_type,
    :description,
    :icon_url,
    :start_time,
    :end_time,
    :schedule_rrule,
    :schedule_timezone,
    :inserted_at,
    :updated_at
  ]

  @derive {Jason.Encoder, only: @public_json_fields}

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
          case TzWorld.version() do
            {:error, :enoent} ->
              changeset
              |> put_change(:schedule_timezone, nil)
              |> add_error(
                :schedule_timezone,
                "Run `mix tz_world.update --include-oceans` on the server to install time zone data."
              )

            {:ok, _} ->
              case TzWorld.timezone_at({lng, lat}) do
                {:ok, tz} -> put_change(changeset, :schedule_timezone, tz)
                {:error, :time_zone_not_found} -> put_change(changeset, :schedule_timezone, nil)
              end
          end

        _ ->
          changeset
      end

    changeset
    |> validate_required([:user_id])
    |> foreign_key_constraint(:user_id)
  end

  @doc """
  Fields safe to include in JSON (schema fields minus user_id).
  Used by PinJSON so the API and Jason.Encoder stay in sync.
  """
  def public_json_fields, do: @public_json_fields
end
