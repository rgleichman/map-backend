defmodule Storymap.TileCacheTest do
  use ExUnit.Case, async: false

  alias Storymap.TileCache

  setup do
    dir =
      Path.join(System.tmp_dir!(), "storymap_tile_cache_#{System.unique_integer([:positive])}")

    Application.put_env(:storymap, :tile_cache_dir, dir)
    on_exit(fn -> File.rm_rf(dir) end)
    {:ok, cache_dir: dir}
  end

  describe "allowed_layer?/1" do
    test "returns true for satellite-v2 and v3" do
      assert TileCache.allowed_layer?("satellite-v2")
      assert TileCache.allowed_layer?("v3")
    end

    test "returns false for other strings" do
      refute TileCache.allowed_layer?("other")
      refute TileCache.allowed_layer?("")
      refute TileCache.allowed_layer?("satellite")
    end
  end

  describe "extension_for_layer/1 and content_type_for_layer/1" do
    test "satellite-v2 is jpeg" do
      assert TileCache.extension_for_layer("satellite-v2") == "jpg"
      assert TileCache.content_type_for_layer("satellite-v2") == "image/jpeg"
    end

    test "v3 is pbf" do
      assert TileCache.extension_for_layer("v3") == "pbf"
      assert TileCache.content_type_for_layer("v3") == "application/x-protobuf"
    end
  end

  describe "valid_tile_params?/3" do
    test "accepts valid z/x/y" do
      assert TileCache.valid_tile_params?(0, 0, 0)
      assert TileCache.valid_tile_params?(2, 2, 1)
      assert TileCache.valid_tile_params?(22, 4_194_303, 4_194_303)
    end

    test "rejects z out of range" do
      refute TileCache.valid_tile_params?(-1, 0, 0)
      refute TileCache.valid_tile_params?(23, 0, 0)
    end

    test "rejects x/y out of range for z" do
      refute TileCache.valid_tile_params?(1, 2, 0)
      refute TileCache.valid_tile_params?(1, 0, 2)
      refute TileCache.valid_tile_params?(1, -1, 0)
      refute TileCache.valid_tile_params?(1, 0, -1)
    end

    test "rejects non-integers" do
      refute TileCache.valid_tile_params?(1.5, 0, 0)
      refute TileCache.valid_tile_params?(1, "0", 0)
    end
  end

  describe "get_tile/4 and put_tile/5" do
    test "returns :miss when not cached" do
      assert TileCache.get_tile("satellite-v2", 1, 0, 0) == :miss
    end

    test "returns cached body after put_tile" do
      TileCache.put_tile("satellite-v2", 1, 0, 0, <<0xFF, 0xD8, 0xFF>>)
      assert {:ok, <<0xFF, 0xD8, 0xFF>>} = TileCache.get_tile("satellite-v2", 1, 0, 0)
    end

    test "v3 tile path uses pbf" do
      TileCache.put_tile("v3", 0, 0, 0, <<0x1F, 0x00>>)
      assert {:ok, <<0x1F, 0x00>>} = TileCache.get_tile("v3", 0, 0, 0)
    end
  end

  describe "get_tiles_json/1 and put_tiles_json/2" do
    test "returns :miss when not cached" do
      assert TileCache.get_tiles_json("satellite-v2") == :miss
    end

    test "returns cached body after put_tiles_json" do
      body = ~s|{"tiles":["https://api.maptiler.com/foo"]}|
      TileCache.put_tiles_json("satellite-v2", body)
      assert {:ok, ^body} = TileCache.get_tiles_json("satellite-v2")
    end
  end

  describe "rewrite_tiles_json_tile_urls/3" do
    test "rewrites tiles array with binary input" do
      json =
        ~s|{"tiles":["https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=secret"]}|

      result =
        TileCache.rewrite_tiles_json_tile_urls(json, "satellite-v2", "/api/tiles/satellite-v2")

      decoded = Jason.decode!(result)
      assert decoded["tiles"] == ["/api/tiles/satellite-v2/{z}/{x}/{y}"]
    end

    test "rewrites tiles array with map input" do
      decoded = %{"tiles" => ["https://example.com/{z}/{x}/{y}.jpg"], "version" => 1}
      result = TileCache.rewrite_tiles_json_tile_urls(decoded, "v3", "/api/tiles/v3")
      out = Jason.decode!(result)
      assert out["tiles"] == ["/api/tiles/v3/{z}/{x}/{y}"]
      assert out["version"] == 1
    end

    test "handles multiple tile URLs" do
      decoded = %{"tiles" => ["https://a.com/{z}/{x}/{y}", "https://b.com/{z}/{x}/{y}"]}

      result =
        TileCache.rewrite_tiles_json_tile_urls(decoded, "satellite-v2", "/api/tiles/satellite-v2")

      out = Jason.decode!(result)

      assert out["tiles"] == [
               "/api/tiles/satellite-v2/{z}/{x}/{y}",
               "/api/tiles/satellite-v2/{z}/{x}/{y}"
             ]
    end
  end

  describe "cache_max_age/0" do
    test "returns positive integer" do
      assert TileCache.cache_max_age() > 0
    end
  end
end
