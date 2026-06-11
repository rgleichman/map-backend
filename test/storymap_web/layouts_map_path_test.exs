defmodule StorymapWeb.LayoutsMapPathTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.Layouts

  test "map_full_bleed_path?/1 matches world and community map routes" do
    assert Layouts.map_full_bleed_path?("/")
    assert Layouts.map_full_bleed_path?("/map")
    assert Layouts.map_full_bleed_path?("/map/")
    assert Layouts.map_full_bleed_path?("/m/stories/map")
    assert Layouts.map_full_bleed_path?("/m/stories/map/")

    refute Layouts.map_full_bleed_path?("/m")
    refute Layouts.map_full_bleed_path?("/m/stories")
    refute Layouts.map_full_bleed_path?("/about")
  end
end
