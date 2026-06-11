defmodule StorymapWeb.LayoutsTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.Layouts

  describe "map_full_bleed_path?/1" do
    test "home and map paths, including trailing slashes" do
      assert Layouts.map_full_bleed_path?("/")
      assert Layouts.map_full_bleed_path?("/map")
      assert Layouts.map_full_bleed_path?("/map/")
    end

    test "community map paths are full-bleed" do
      assert Layouts.map_full_bleed_path?("/m/stories/map")
      assert Layouts.map_full_bleed_path?("/m/stories/map/")
      refute Layouts.map_full_bleed_path?("/m/stories")
      refute Layouts.map_full_bleed_path?("/m")
    end

    test "other paths are not full-bleed map" do
      refute Layouts.map_full_bleed_path?("/privacy-policy")
      refute Layouts.map_full_bleed_path?("/map/extra")
    end
  end

  describe "full_viewport_map_path?/1" do
    test "aliases map_full_bleed_path?/1" do
      assert Layouts.full_viewport_map_path?("/map") == Layouts.map_full_bleed_path?("/map")

      assert Layouts.full_viewport_map_path?("/m/foo/map") ==
               Layouts.map_full_bleed_path?("/m/foo/map")
    end
  end
end
