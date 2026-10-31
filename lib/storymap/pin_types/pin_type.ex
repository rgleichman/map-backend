defmodule Storymap.PinTypes.PinType do
  @moduledoc """
  Unified pin type catalog row (system seeds + user-defined types).
  """
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.PinTypes.Icons
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
          icon_background_color: String.t() | nil,
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
    field :icon_background_color, :string
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
      :icon_background_color,
      :icon,
      :schema,
      :time_mode,
      :allow_open_24_7,
      :enabled
    ])
    |> validate_required([:label, :schema])
    |> put_slug()
    |> normalize_hex_color(:marker_color)
    |> validate_hex_color(:marker_color)
    |> normalize_hex_color(:icon_background_color)
    |> validate_hex_color(:icon_background_color)
    |> validate_length(:label, max: 120)
    |> validate_length(:description, max: 2000)
    |> normalize_icon()
    |> validate_icon()
    |> validate_schema_shape()
    |> unique_constraint(:slug)
    |> foreign_key_constraint(:created_by_user_id)
  end

  defp put_slug(changeset) do
    existing = changeset.data.slug

    slug =
      case get_change(changeset, :slug) || existing do
        nil -> Slug.generate_from_label(get_field(changeset, :label) || "")
        slug -> Slug.normalize(slug)
      end

    case accept_slug(slug, existing) do
      {:ok, normalized} ->
        # Always put_change so a cast with different casing is cleared; Ecto
        # discards the change when the value matches the persisted slug.
        put_change(changeset, :slug, normalized)

      {:error, reason} ->
        add_error(changeset, :slug, Slug.error_message(reason))
    end
  end

  # Seeded system rows keep reserved slugs (`one_time`, etc.); edits to label/schema
  # must not fail reserved-slug validation when the slug is unchanged.
  defp accept_slug(nil, _existing), do: {:error, :required}

  defp accept_slug(slug, existing) when is_binary(slug) do
    case Slug.validate(slug) do
      {:ok, normalized} ->
        {:ok, normalized}

      {:error, :reserved} ->
        if is_binary(existing) and slug == Slug.normalize(existing) do
          {:ok, slug}
        else
          {:error, :reserved}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp validate_schema_shape(changeset) do
    schema = get_field(changeset, :schema) || %{}

    case Storymap.PinTypes.Schema.validate_definition(schema) do
      :ok -> changeset
      {:error, message} -> add_error(changeset, :schema, message)
    end
  end

  defp normalize_icon(changeset) do
    case get_change(changeset, :icon) do
      nil ->
        changeset

      icon when is_binary(icon) ->
        icon = String.trim(icon)

        if icon == "" do
          put_change(changeset, :icon, nil)
        else
          put_change(changeset, :icon, icon)
        end

      _ ->
        changeset
    end
  end

  defp validate_icon(changeset) do
    validate_change(changeset, :icon, fn :icon, icon ->
      cond do
        is_nil(icon) -> []
        Icons.valid?(icon) -> []
        true -> [icon: "is not a known marker glyph"]
      end
    end)
  end

  @spec normalize_hex_color(Ecto.Changeset.t(), atom()) :: Ecto.Changeset.t()
  defp normalize_hex_color(changeset, field) do
    case get_change(changeset, field) do
      nil ->
        changeset

      color when is_binary(color) ->
        put_change(changeset, field, normalize_hex_string(color))

      _ ->
        changeset
    end
  end

  @spec normalize_hex_string(String.t()) :: String.t() | nil
  defp normalize_hex_string(color) do
    color = color |> String.trim() |> String.downcase()

    cond do
      color == "" -> nil
      String.match?(color, ~r/^[0-9a-f]{6}$/) -> "#" <> color
      true -> color
    end
  end

  @spec validate_hex_color(Ecto.Changeset.t(), atom()) :: Ecto.Changeset.t()
  defp validate_hex_color(changeset, field) do
    validate_format(changeset, field, @hex_color_regex,
      message: "must be a hex color like #RRGGBB"
    )
  end
end
