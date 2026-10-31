defmodule Storymap.Pins.PinTypeColors do
  @moduledoc """
  Pin type display colors and labels.

  Loaded at compile time from `assets/shared/pin_type_colors.json` (single source of truth).
  """

  @colors_path Path.expand("../../../assets/shared/pin_type_colors.json", __DIR__)
  @external_resource @colors_path

  @colors @colors_path |> File.read!() |> Jason.decode!()
  @default_type "one_time"
  @fallback_color "#6b7280"

  @doc "Returns the main pin color hex for a pin type (map markers, list dots)."
  @spec color(String.t() | any()) :: String.t()
  def color(pin_type) when is_binary(pin_type) do
    case Map.get(@colors, pin_type) do
      %{"color" => color} -> color
      _ -> Map.fetch!(@colors, @default_type)["color"]
    end
  end

  def color(_), do: @fallback_color

  @doc """
  Palette color for a known system slug, or nil.

  Used when a catalog row has no `marker_color` so the editor can match the map.
  """
  @spec known_color(String.t() | nil) :: String.t() | nil
  def known_color(slug) when is_binary(slug) do
    case Map.get(@colors, slug) do
      %{"color" => color} -> color
      _ -> nil
    end
  end

  def known_color(_), do: nil

  @doc """
  Map glyph color when `marker_color` is unset and the slug is not a system type.

  Matches JS `DEFAULT_PIN_TYPE_COLORS` (`other`).
  """
  @spec map_fallback_color() :: String.t()
  def map_fallback_color, do: color("other")

  @doc "Returns the full color entry map for a pin type, or the default type."
  @spec get(String.t() | any()) :: map()
  def get(pin_type) when is_binary(pin_type) do
    Map.get(@colors, pin_type, Map.fetch!(@colors, @default_type))
  end
end
