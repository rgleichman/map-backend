defmodule StorymapWeb.LayoutsTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.Layouts

  describe "full_viewport_map_path?/1" do
    test "home and map paths, including trailing slashes" do
      assert Layouts.full_viewport_map_path?("/")
      assert Layouts.full_viewport_map_path?("/map")
      assert Layouts.full_viewport_map_path?("/map/")
    end

    test "other paths are not full-viewport map" do
      refute Layouts.full_viewport_map_path?("/privacy-policy")
      refute Layouts.full_viewport_map_path?("/map/extra")
    end
  end
end
