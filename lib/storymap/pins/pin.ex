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
    :custom_data,
    :status,
    :visible_on_world_map,
    :inserted_at,
    :updated_at
  ]

  @statuses [:pending, :approved, :rejected, :archived]
  @builtin_pin_types Storymap.PinTypes.CustomPinType.builtin_pin_types()

  @type status :: :pending | :approved | :rejected | :archived

  @type t :: %__MODULE__{
          id: integer() | nil,
          user_id: integer() | nil,
          sub_map_id: integer() | nil,
          status: status(),
          visible_on_world_map: boolean(),
          title: String.t() | nil,
          latitude: float() | nil,
          longitude: float() | nil,
          description: String.t() | nil,
          icon_url: String.t() | nil,
          start_time: DateTime.t() | nil,
          end_time: DateTime.t() | nil,
          pin_type: String.t() | nil,
          schedule_rrule: String.t() | nil,
          schedule_timezone: String.t() | nil,
          custom_data: map(),
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  @derive {Jason.Encoder, only: @public_json_fields}

  schema "pins" do
    belongs_to :user, Storymap.Accounts.User
    belongs_to :sub_map, Storymap.SubMaps.SubMap
    field :status, Ecto.Enum, values: @statuses, default: :approved
    field :visible_on_world_map, :boolean, default: true
    field :title, :string
    field :latitude, :float
    field :longitude, :float
    # Plain text with optional links; see docs/PIN_DESCRIPTIONS.md
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
    field :custom_data, :map, default: %{}
    many_to_many :tags, Storymap.Tags.Tag, join_through: "pin_tags", on_replace: :delete

    timestamps(type: :utc_datetime)
  end

  @doc false
  @spec changeset(t(), map()) :: Ecto.Changeset.t()
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
        :schedule_rrule,
        :custom_data,
        :sub_map_id,
        :status,
        :visible_on_world_map
      ])
      |> validate_required([:title, :latitude, :longitude, :pin_type])
      |> validate_pin_type()
      |> validate_length(:description, max: 5000)
      |> put_default_custom_data()

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
                "Run `mix tz_world.install --include-oceans` on the server to install time zone data."
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

    changeset =
      case get_field(changeset, :pin_type) do
        "other" ->
          clear_schedule_fields(changeset)

        "custom:" <> _ ->
          clear_schedule_fields(changeset)

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
  @spec public_json_fields() :: [atom()]
  def public_json_fields, do: @public_json_fields

  @spec statuses() :: [status()]
  def statuses, do: @statuses

  @spec builtin_pin_types() :: [String.t()]
  def builtin_pin_types, do: @builtin_pin_types

  @spec custom_pin_type?(String.t() | any()) :: boolean()
  def custom_pin_type?(pin_type) when is_binary(pin_type),
    do: String.starts_with?(pin_type, "custom:")

  def custom_pin_type?(_), do: false

  defp clear_schedule_fields(changeset) do
    changeset
    |> put_change(:start_time, nil)
    |> put_change(:end_time, nil)
    |> put_change(:schedule_rrule, nil)
    |> put_change(:schedule_timezone, nil)
  end

  defp validate_pin_type(changeset) do
    case get_field(changeset, :pin_type) do
      type when type in @builtin_pin_types -> changeset
      "custom:" <> slug when byte_size(slug) > 0 -> changeset
      _ -> add_error(changeset, :pin_type, "is invalid")
    end
  end

  defp put_default_custom_data(changeset) do
    case get_field(changeset, :custom_data) do
      nil -> put_change(changeset, :custom_data, %{})
      _ -> changeset
    end
  end
end
