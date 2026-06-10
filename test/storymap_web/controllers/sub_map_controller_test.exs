defmodule StorymapWeb.SubMapControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.SubMapsFixtures

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "GET /api/sub_maps" do
    test "lists public communities", %{conn: conn} do
      sub_map = sub_map_fixture(%{"name" => "Listed"})
      conn = get(conn, ~p"/api/sub_maps")
      body = json_response(conn, 200)
      assert Enum.any?(body["data"], &(&1["community_url"] == sub_map.community_url))
    end
  end

  describe "POST /api/sub_maps" do
    setup :register_and_log_in_user

    test "creates community", %{conn: conn} do
      conn =
        post(conn, ~p"/api/sub_maps", %{
          sub_map: %{
            name: "My BBQ Map",
            community_url: "my-bbq",
            contribution_mode: "open"
          }
        })

      assert %{"community_url" => "my-bbq"} = json_response(conn, 201)["data"]
    end
  end

  describe "community pins" do
    setup :register_and_log_in_user

    test "POST pin in community", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "pin-api-test"}, user)

      conn =
        post(conn, ~p"/api/sub_maps/#{sub_map.community_url}/pins", %{
          pin: %{
            title: "Joe's BBQ",
            latitude: 30.27,
            longitude: -97.74,
            pin_type: "other"
          }
        })

      assert %{"title" => "Joe's BBQ"} = json_response(conn, 201)["data"]
    end
  end
end
