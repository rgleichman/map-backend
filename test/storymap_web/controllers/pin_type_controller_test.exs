defmodule StorymapWeb.PinTypeControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.AccountsFixtures
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

    test "forbids create when user is muted", %{conn: conn, user: user} do
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        post(conn, ~p"/api/pin_types", %{
          pin_type: %{
            label: "Muted Type",
            schema: %{
              fields: [%{key: "x", label: "X", type: "text"}]
            }
          }
        })

      assert json_response(conn, 403)["errors"] != %{}
    end
  end

  describe "PATCH /api/pin_types/:id" do
    setup :register_and_log_in_user

    test "forbids update when user is muted", %{conn: conn, user: user} do
      pin_type = custom_pin_type_fixture(%{}, user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        patch(conn, ~p"/api/pin_types/#{pin_type.id}", %{
          pin_type: %{label: "Renamed"}
        })

      assert json_response(conn, 403)["errors"] != %{}
    end
  end

  describe "DELETE /api/pin_types/:id" do
    setup :register_and_log_in_user

    test "forbids delete when user is muted", %{conn: conn, user: user} do
      pin_type = custom_pin_type_fixture(%{}, user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn = delete(conn, ~p"/api/pin_types/#{pin_type.id}")
      assert response(conn, 403)
    end
  end
end
