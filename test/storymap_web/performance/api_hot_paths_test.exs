defmodule StorymapWeb.Performance.ApiHotPathsTest do
  @moduledoc """
  HTTP-level performance checks for map API endpoints.

  Run only these: `mix test test/storymap_web/performance`
  """
  use StorymapWeb.ConnCase, async: false

  @moduletag :performance

  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures
  import Storymap.PerformanceHelpers

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "GET /api/pins" do
    setup do
      user = Storymap.AccountsFixtures.user_fixture()

      for _ <- 1..15 do
        pin_fixture(%{"title" => "api-#{System.unique_integer([:positive])}"}, user)
      end

      :ok
    end

    test "responds within time budget", %{conn: conn} do
      assert_under_ms(500, fn -> get(conn, ~p"/api/pins") end)
    end
  end

  describe "GET /api/sub_maps" do
    setup do
      owner = Storymap.AccountsFixtures.user_fixture()

      for i <- 1..6 do
        sub_map_fixture(
          %{
            "name" => "API #{i}",
            "community_url" => "api-perf-#{i}-#{System.unique_integer([:positive])}"
          },
          owner
        )
      end

      :ok
    end

    test "responds within time budget", %{conn: conn} do
      assert_under_ms(500, fn -> get(conn, ~p"/api/sub_maps") end)
    end
  end

  describe "GET /api/map/style" do
    test "responds within time budget", %{conn: conn} do
      assert_under_ms(200, fn -> get(conn, ~p"/api/map/style") end)
    end
  end
end
