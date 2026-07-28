defmodule Storymap.PinTypes.PinType do
  @moduledoc """
  Unified pin type catalog row (system seeds + user-defined types).
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.PinTypes.Slug

  @time_modes [:none, :one_time, :hours]
  @hex_color_regex ~r/^#[0-9a-fA-F]{6}$/

  @type time_mode :: :none | :one_time | :hours

  @type t :: %__MODULE__{
          id: integer() | nil,
          slug: String.t() | nil,
          label: String.t() | nil,
          description: String.t() | nil,
          marker_color: String.t() | nil,
          icon: String.t() | nil,
          schema: map(),
          time_mode: time_mode(),
          is_system: boolean(),
          allow_open_24_7: boolean(),
          enabled: boolean(),
          created_by_user_id: integer() | nil,
          inserted_at: DateTime.t() | nil,
          updated_at: DateTime.t() | nil
        }

  schema "pin_types" do
    field :slug, :string
    field :label, :string
    field :description, :string
    field :marker_color, :string
    field :icon, :string
    field :schema, :map, default: %{}
    field :time_mode, Ecto.Enum, values: @time_modes, default: :none
    field :is_system, :boolean, default: false
    field :allow_open_24_7, :boolean, default: false
    field :enabled, :boolean, default: true

    belongs_to :created_by, User, foreign_key: :created_by_user_id

    timestamps(type: :utc_datetime)
  end

  @spec time_modes() :: [time_mode()]
  def time_modes, do: @time_modes

  @spec time_mode_options() :: [{String.t(), time_mode()}]
  def time_mode_options do
    [
      {"None (no schedule)", :none},
      {"One-time event (date and time)", :one_time},
      {"Hours (recurring schedule)", :hours}
    ]
  end

  @spec changeset(t(), map()) :: Ecto.Changeset.t()
  def changeset(pin_type, attrs) do
    pin_type
    |> cast(attrs, [
      :slug,
      :label,
      :description,
      :marker_color,
      :icon,
      :schema,
      :time_mode,
      :allow_open_24_7,
      :enabled
    ])
    |> validate_required([:label, :schema])
    |> put_slug()
    |> normalize_marker_color()
    |> validate_length(:marker_color, is: 7)
    |> validate_format(:marker_color, @hex_color_regex,
      message: "must be a hex color like #RRGGBB"
    )
    |> validate_length(:label, max: 120)
    |> validate_length(:description, max: 2000)
    |> validate_schema_shape()
    |> unique_constraint(:slug)
    |> foreign_key_constraint(:created_by_user_id)
  end

  defp put_slug(changeset) do
    slug =
      case get_change(changeset, :slug) || get_field(changeset, :slug) do
        nil -> Slug.generate_from_label(get_field(changeset, :label) || "")
        slug -> Slug.normalize(slug)
      end

    case Slug.validate(slug || "") do
      {:ok, normalized} -> put_change(changeset, :slug, normalized)
      {:error, reason} -> add_error(changeset, :slug, Slug.error_message(reason))
    end
  end

  defp validate_schema_shape(changeset) do
    schema = get_field(changeset, :schema) || %{}

    case Storymap.PinTypes.Schema.validate_definition(schema) do
      :ok -> changeset
      {:error, message} -> add_error(changeset, :schema, message)
    end
  end

  defp normalize_marker_color(changeset) do
    case get_change(changeset, :marker_color) do
      nil ->
        changeset

      color when is_binary(color) ->
        color = String.trim(color)

        if color == "" do
          put_change(changeset, :marker_color, nil)
        else
          put_change(changeset, :marker_color, String.downcase(color))
        end

      _ ->
        changeset
    end
  end
end
