defmodule StorymapWeb.MapControllerTest do
  use StorymapWeb.ConnCase, async: false

  alias Storymap.TileCache

  setup %{conn: conn} do
    dir = Path.join(System.tmp_dir!(), "storymap_map_ctrl_#{System.unique_integer([:positive])}")
    Application.put_env(:storymap, :tile_cache_dir, dir)
    on_exit(fn -> File.rm_rf(dir) end)
    conn = put_req_header(conn, "accept", "application/json")
    {:ok, conn: conn, cache_dir: dir}
  end

  describe "GET /api/map/style" do
    test "returns style with projection and rewritten tile source URLs", %{conn: conn} do
      conn = get(conn, ~p"/api/map/style")
      assert json_response(conn, 200)
      body = json_response(conn, 200)
      assert body["projection"] == %{"type" => "globe"}
      sources = body["sources"] || %{}
      assert sources["satellite"]["url"] == "/api/map/tiles.json?layer=satellite-v2"
      assert sources["openmaptiles"]["url"] == "/api/map/tiles.json?layer=v3"
    end
  end

  describe "GET /api/map/tiles.json" do
    test "returns 400 when layer is missing or invalid", %{conn: conn} do
      conn = get(conn, ~p"/api/map/tiles.json")
      assert json_response(conn, 400)["error"] == "invalid layer"
    end

    test "returns 400 for invalid layer param", %{conn: conn} do
      conn = get(conn, ~p"/api/map/tiles.json?layer=invalid")
      assert json_response(conn, 400)["error"] == "invalid layer"
    end

    test "returns 200 and rewritten tiles when layer is valid and cached", %{conn: conn} do
      # Pre-populate cache with rewritten TileJSON so we don't hit MapTiler
      raw =
        ~s|{"tiles":["https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg"],"version":1}|

      rewritten =
        TileCache.rewrite_tiles_json_tile_urls(raw, "satellite-v2", "/api/tiles/satellite-v2")

      TileCache.put_tiles_json("satellite-v2", rewritten)

      conn = get(conn, ~p"/api/map/tiles.json?layer=satellite-v2")
      assert response(conn, 200)
      body = json_response(conn, 200)
      assert body["tiles"] == ["/api/tiles/satellite-v2/{z}/{x}/{y}"]
      assert get_resp_header(conn, "cache-control") != []
    end
  end

  describe "GET /api/tiles/:layer/:z/:x/:y" do
    test "returns 400 for invalid layer", %{conn: conn} do
      conn = get(conn, ~p"/api/tiles/invalid/0/0/0")
      assert json_response(conn, 400)["error"] == "invalid tile params"
    end

    test "returns 400 for invalid z/x/y", %{conn: conn} do
      conn = get(conn, ~p"/api/tiles/satellite-v2/99/0/0")
      assert json_response(conn, 400)["error"] == "invalid tile params"
    end

    test "returns 200 and tile body when cached", %{conn: conn} do
      TileCache.put_tile("satellite-v2", 0, 0, 0, <<0xFF, 0xD8, 0xFF>>)

      conn = get(conn, ~p"/api/tiles/satellite-v2/0/0/0")
      assert response(conn, 200) == <<0xFF, 0xD8, 0xFF>>
      assert [ct | _] = get_resp_header(conn, "content-type")
      assert ct =~ "image/jpeg"
      assert get_resp_header(conn, "cache-control") != []
    end

    test "returns correct content-type for v3 vector tiles when cached", %{conn: conn} do
      TileCache.put_tile("v3", 1, 0, 1, <<0x1F, 0x00>>)

      conn = get(conn, ~p"/api/tiles/v3/1/0/1")
      assert response(conn, 200)
      assert [ct | _] = get_resp_header(conn, "content-type")
      assert ct =~ "application/x-protobuf"
    end
  end
end
