defmodule Storymap.Pins.Pin do
  @moduledoc """
  Pin schema. Any new schema field that should appear in JSON must be added to
  `@public_json_fields` (and must not be user_id, for privacy).
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Pins.AdHocFields
  alias Storymap.PinTypes.PinType

  # Single source of truth for JSON-safe fields (schema fields minus user_id).
  # Used by @derive and by PinJSON so encode and API stay in sync.
  # Associations (e.g. tags) are not included—PinJSON adds those as view-only keys.
  # `:pin_type` slug is emitted by PinJSON from the association, not this list.
  @public_json_fields [
    :id,
    :title,
    :latitude,
    :longitude,
    :pin_type_id,
    :description,
    :icon_url,
    :start_time,
    :end_time,
    :schedule_rrule,
    :schedule_timezone,
    :custom_data,
    :ad_hoc_fields,
    :status,
    :visible_on_world_map,
    :inserted_at,
    :updated_at
  ]

  @statuses [:pending, :approved, :rejected, :archived]

  @type status :: :pending | :approved | :rejected | :archived

  @type t :: %__MODULE__{
          id: integer() | nil,
          user_id: integer() | nil,
          sub_map_id: integer() | nil,
          pin_type_id: integer() | nil,
          status: status(),
          visible_on_world_map: boolean(),
          title: String.t() | nil,
          latitude: float() | nil,
          longitude: float() | nil,
          description: String.t() | nil,
          icon_url: String.t() | nil,
          start_time: DateTime.t() | nil,
          end_time: DateTime.t() | nil,
          schedule_rrule: String.t() | nil,
          schedule_timezone: String.t() | nil,
          custom_data: map(),
          ad_hoc_fields: [map()],
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  @derive {Jason.Encoder, only: @public_json_fields}

  schema "pins" do
    belongs_to :user, Storymap.Accounts.User
    belongs_to :sub_map, Storymap.SubMaps.SubMap
    belongs_to :pin_type, PinType
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
    # For time_mode hours: iCal RRULE (e.g. FREQ=WEEKLY;BYDAY=MO,WE,FR;BYHOUR=15;BYMINUTE=0)
    field :schedule_rrule, :string

    # IANA timezone for schedule (e.g. America/Los_Angeles). Interpret BYHOUR/BYMINUTE in this zone.
    field :schedule_timezone, :string
    field :custom_data, :map, default: %{}
    field :ad_hoc_fields, {:array, :map}, default: []
    many_to_many :tags, Storymap.Tags.Tag, join_through: "pin_tags", on_replace: :delete

    has_many :outgoing_references, Storymap.Pins.PinReference, foreign_key: :source_pin_id
    has_many :comments, Storymap.Pins.PinComment

    timestamps(type: :utc_datetime)
  end

  @doc false
  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(pin, attrs) do
    changeset =
      pin
      # SECURITY INVARIANT:
      # Do not cast privileged fields (e.g. :status, :sub_map_id, :visible_on_world_map) from
      # client input. Those are set in context-level workflows (world vs sub-map create),
      # moderation endpoints, and the visibility sanitizer.
      |> cast(attrs, [
        :title,
        :latitude,
        :longitude,
        :description,
        :icon_url,
        :start_time,
        :end_time,
        :pin_type_id,
        :schedule_rrule,
        :schedule_timezone,
        :custom_data,
        :ad_hoc_fields
      ])
      |> validate_required([:title, :latitude, :longitude, :pin_type_id])
      |> validate_icon_url()
      |> validate_length(:description, max: 5000)
      |> put_default_custom_data()
      |> put_default_ad_hoc_fields()
      |> AdHocFields.validate()
      |> foreign_key_constraint(:pin_type_id)

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

    changeset
    |> validate_required([:user_id])
    |> foreign_key_constraint(:user_id)
  end

  @doc false
  @spec clear_schedule_fields(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def clear_schedule_fields(changeset) do
    changeset
    |> put_change(:start_time, nil)
    |> put_change(:end_time, nil)
    |> put_change(:schedule_rrule, nil)
    |> put_change(:schedule_timezone, nil)
  end

  @doc false
  @spec clear_schedule_rrule(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def clear_schedule_rrule(changeset) do
    put_change(changeset, :schedule_rrule, nil)
  end

  @doc """
  Fields safe to include in JSON (schema fields minus user_id).
  Used by PinJSON so the API and Jason.Encoder stay in sync.
  """
  @spec public_json_fields() :: [atom()]
  def public_json_fields, do: @public_json_fields

  @spec statuses() :: [status()]
  def statuses, do: @statuses

  @doc """
  Human-readable label for a pin moderation status (LiveView lists, etc.).
  """
  @spec status_label(status() | String.t()) :: String.t()
  def status_label(:pending), do: "Pending"
  def status_label(:approved), do: "Approved"
  def status_label(:rejected), do: "Rejected"
  def status_label(:archived), do: "Archived"
  def status_label("pending"), do: "Pending"
  def status_label("approved"), do: "Approved"
  def status_label("rejected"), do: "Rejected"
  def status_label("archived"), do: "Archived"
  def status_label(_), do: "Unknown"

  @doc """
  DaisyUI badge class for a pin moderation status.
  """
  @spec status_badge_class(status() | String.t()) :: String.t()
  def status_badge_class(:pending), do: "badge-warning"
  def status_badge_class(:approved), do: "badge-success"
  def status_badge_class(:rejected), do: "badge-error"
  def status_badge_class(:archived), do: "badge-ghost"
  def status_badge_class("pending"), do: "badge-warning"
  def status_badge_class("approved"), do: "badge-success"
  def status_badge_class("rejected"), do: "badge-error"
  def status_badge_class("archived"), do: "badge-ghost"
  def status_badge_class(_), do: "badge-ghost"

  defp put_default_custom_data(changeset) do
    case get_field(changeset, :custom_data) do
      nil -> put_change(changeset, :custom_data, %{})
      _ -> changeset
    end
  end

  defp put_default_ad_hoc_fields(changeset) do
    case get_field(changeset, :ad_hoc_fields) do
      nil -> put_change(changeset, :ad_hoc_fields, [])
      _ -> changeset
    end
  end

  defp validate_icon_url(changeset) do
    validate_change(changeset, :icon_url, fn :icon_url, url ->
      cond do
        is_nil(url) -> []
        is_binary(url) and String.trim(url) == "" -> []
        Storymap.URL.safe_url?(url) -> []
        true -> [icon_url: "is not a safe URL"]
      end
    end)
  end
end
