defmodule StorymapWeb.PinTypeControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.PinTypesFixtures

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "GET /api/pin_types" do
    test "lists enabled custom pin types", %{conn: conn} do
      pin_type = custom_pin_type_fixture()

      conn = get(conn, ~p"/api/pin_types")
      slugs = Enum.map(json_response(conn, 200)["data"], & &1["slug"])
      assert pin_type.slug in slugs
    end
  end

  describe "POST /api/pin_types" do
    setup :register_and_log_in_user

    test "creates a custom pin type", %{conn: conn} do
      conn =
        post(conn, ~p"/api/pin_types", %{
          pin_type: %{
            label: "Bike Rack",
            schema: %{
              fields: [%{key: "capacity", label: "Capacity", type: "number"}]
            }
          }
        })

      data = json_response(conn, 201)["data"]
      assert data["slug"]
      assert data["pin_type"] == "custom:#{data["slug"]}"
    end
  end
end
