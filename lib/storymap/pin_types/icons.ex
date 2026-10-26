defmodule Storymap.PinTypes.Icons do
  @moduledoc """
  Marker glyphs a catalog row may store in `icon`.

  Loaded at compile time from `assets/shared/pin_icons.json`. Plant drawings keep
  each original gray ink as a separate layer so they can be recolored.
  """

  @icons_path Path.expand("../../../assets/shared/pin_icons.json", __DIR__)
  @external_resource @icons_path

  @payload @icons_path |> File.read!() |> Jason.decode!()
  @icons @payload["icons"]
  @order @payload["order"]
  @names MapSet.new(Map.keys(@icons))

  @type name :: String.t()
  @type t :: map()

  @spec names() :: [name()]
  def names, do: @order

  @spec valid?(term()) :: boolean()
  def valid?(name) when is_binary(name), do: MapSet.member?(@names, name)
  def valid?(_), do: false

  @spec get(name()) :: t() | nil
  def get(name) when is_binary(name), do: Map.get(@icons, name)

  @spec all() :: [{name(), t()}]
  def all do
    Enum.map(@order, fn name -> {name, Map.fetch!(@icons, name)} end)
  end

  @doc """
  Opacity of `currentColor` for an artist gray ink (0 = black, 255 = paper).
  Stepped so light fills stay visible when recolored.
  """
  @spec layer_opacity(number()) :: float()
  def layer_opacity(gray) when is_number(gray) do
    cond do
      gray <= 20 -> 1.0
      gray <= 120 -> 0.72
      gray <= 185 -> 0.48
      true -> 0.28
    end
  end
end
