defmodule Storymap.PinTypes.CustomPinType do
  @moduledoc false
  use Ecto.Schema
  import Ecto.Changeset

  alias Storymap.Accounts.User
  alias Storymap.PinTypes.Slug

  @builtin_pin_types ~w(one_time scheduled food_bank other)
  @hex_color_regex ~r/^#[0-9a-fA-F]{6}$/

  schema "custom_pin_types" do
    field :slug, :string
    field :label, :string
    field :description, :string
    field :marker_color, :string
    field :icon, :string
    field :schema, :map, default: %{}
    field :enabled, :boolean, default: true

    belongs_to :created_by, User, foreign_key: :created_by_user_id

    timestamps(type: :utc_datetime)
  end

  def builtin_pin_types, do: @builtin_pin_types

  def changeset(custom_pin_type, attrs) do
    custom_pin_type
    |> cast(attrs, [:slug, :label, :description, :marker_color, :icon, :schema, :enabled])
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

  def pin_type_value(%__MODULE__{slug: slug}), do: "custom:#{slug}"

  def pin_type_value(slug) when is_binary(slug), do: "custom:#{slug}"

  def custom_pin_type?(pin_type) when is_binary(pin_type),
    do: String.starts_with?(pin_type, "custom:")

  def custom_pin_type?(_), do: false

  def slug_from_pin_type("custom:" <> slug) when slug != "", do: slug
  def slug_from_pin_type(_), do: nil

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
