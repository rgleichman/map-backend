defmodule StorymapWeb.MapPathsTest do
  use ExUnit.Case, async: true

  alias StorymapWeb.MapPaths

  # Keep in sync with layouts_test.exs and assets/js/react/mapRoute.test.ts.

  describe "map_pathname?/1" do
    test "home and map paths, including trailing slashes" do
      assert MapPaths.map_pathname?("/")
      assert MapPaths.map_pathname?("/map")
      assert MapPaths.map_pathname?("/map/")
    end

    test "garden map paths" do
      assert MapPaths.map_pathname?("/g/stories/map")
      assert MapPaths.map_pathname?("/g/stories/map/")
      refute MapPaths.map_pathname?("/g/stories")
      refute MapPaths.map_pathname?("/g")
    end

    test "legacy /m garden map paths" do
      assert MapPaths.map_pathname?("/m/stories/map")
      assert MapPaths.map_pathname?("/m/stories/map/")
      refute MapPaths.map_pathname?("/m/stories")
      refute MapPaths.map_pathname?("/m")
    end

    test "other paths are not map pages" do
      refute MapPaths.map_pathname?("/privacy-policy")
      refute MapPaths.map_pathname?("/map/extra")
      refute MapPaths.map_pathname?("/about")
    end
  end

  describe "garden_nav_active?/1" do
    test "is current on garden index and garden pages, not maps" do
      assert MapPaths.garden_nav_active?("/g")
      assert MapPaths.garden_nav_active?("/g/")
      assert MapPaths.garden_nav_active?("/g/stories")
      assert MapPaths.garden_nav_active?("/g/stories/settings")
      refute MapPaths.garden_nav_active?("/g/stories/map")
      assert MapPaths.garden_nav_active?("/m")
      assert MapPaths.garden_nav_active?("/m/stories")
      refute MapPaths.garden_nav_active?("/m/stories/map")
      refute MapPaths.garden_nav_active?("/")
      refute MapPaths.garden_nav_active?("/about")
    end
  end

  describe "community_url/1" do
    test "reads garden slug from canonical /g map paths only" do
      assert MapPaths.community_url("/g/stories/map") == "stories"
      assert MapPaths.community_url("/g/stories/map/") == "stories"
      refute MapPaths.community_url("/")
      refute MapPaths.community_url("/about")
      refute MapPaths.community_url("/g/stories")
      refute MapPaths.community_url("/m/stories/map")
    end
  end

  describe "map_path/1 and map_path_with_pin/2" do
    test "builds canonical world and garden map strings" do
      assert MapPaths.map_path(nil) == "/map"
      assert MapPaths.map_path("stories") == "/g/stories/map"
      assert MapPaths.map_path_with_pin("stories", 12) == "/g/stories/map?pin=12"
      assert MapPaths.map_path_with_pin(nil, 12) == "/map?pin=12"
    end
  end
end
