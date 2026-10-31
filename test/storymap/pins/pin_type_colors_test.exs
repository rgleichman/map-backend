defmodule Storymap.Pins.PinTypeColorsTest do
  use ExUnit.Case, async: true

  alias Storymap.Pins.PinTypeColors

  test "color/1 returns canonical colors from shared JSON" do
    assert PinTypeColors.color("one_time") == "#f97316"
    assert PinTypeColors.color("scheduled") == "#3b82f6"
    assert PinTypeColors.color("food_bank") == "#22c55e"
    assert PinTypeColors.color("other") == "#a855f7"
  end

  test "color/1 falls back to one_time for unknown types" do
    assert PinTypeColors.color("invalid") == "#f97316"
    assert PinTypeColors.color(nil) == "#6b7280"
  end

  test "known_color/1 is nil for unknown slugs" do
    assert PinTypeColors.known_color("other") == "#a855f7"
    assert PinTypeColors.known_color("invalid") == nil
    assert PinTypeColors.known_color(nil) == nil
  end

  test "map_fallback_color/0 matches the other palette" do
    assert PinTypeColors.map_fallback_color() == "#a855f7"
  end
end
