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

  describe "GET /api/pin_types/:slug" do
    test "shows enabled custom pin type", %{conn: conn} do
      pin_type = custom_pin_type_fixture()

      conn = get(conn, ~p"/api/pin_types/#{pin_type.slug}")
      data = json_response(conn, 200)["data"]

      assert data["slug"] == pin_type.slug
      assert data["enabled"] == true
    end

    test "returns 404 for disabled custom pin type", %{conn: conn} do
      pin_type = custom_pin_type_fixture()

      pin_type
      |> Ecto.Changeset.change(%{enabled: false})
      |> Storymap.Repo.update!()

      conn = get(conn, ~p"/api/pin_types/#{pin_type.slug}")
      assert json_response(conn, 404)["errors"]["detail"] == "Not Found"
    end

    test "returns 404 for missing slug", %{conn: conn} do
      conn = get(conn, ~p"/api/pin_types/does-not-exist")
      assert json_response(conn, 404)["errors"]["detail"] == "Not Found"
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

    test "updates a custom pin type", %{conn: conn, user: user} do
      pin_type = custom_pin_type_fixture(%{}, user)

      conn =
        patch(conn, ~p"/api/pin_types/#{pin_type.id}", %{
          pin_type: %{label: "Renamed Type"}
        })

      assert json_response(conn, 200)["data"]["label"] == "Renamed Type"
    end

    test "forbids update for non-owner", %{conn: conn} do
      owner = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, owner)

      conn =
        patch(conn, ~p"/api/pin_types/#{pin_type.id}", %{
          pin_type: %{label: "Stolen"}
        })

      assert json_response(conn, 403)["errors"]["detail"] == "Forbidden"
    end

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

    test "deletes an unused custom pin type", %{conn: conn, user: user} do
      pin_type = custom_pin_type_fixture(%{}, user)

      conn = delete(conn, ~p"/api/pin_types/#{pin_type.id}")
      assert response(conn, 204) == ""
      refute Storymap.PinTypes.get_by_slug(pin_type.slug)
    end

    test "forbids delete for non-owner", %{conn: conn} do
      owner = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, owner)

      conn = delete(conn, ~p"/api/pin_types/#{pin_type.id}")
      assert json_response(conn, 403)["errors"]["detail"] == "Forbidden"
    end

    test "returns 422 when pin type is in use", %{conn: conn, user: user} do
      pin_type = custom_pin_type_fixture(%{}, user)

      assert {:ok, _} =
               Storymap.Pins.create_pin(
                 %{
                   "title" => "Machine",
                   "latitude" => 30.0,
                   "longitude" => -97.0,
                   "pin_type" => Storymap.PinTypes.CustomPinType.pin_type_value(pin_type),
                   "custom_data" => %{"status" => "working"}
                 },
                 user.id
               )

      conn = delete(conn, ~p"/api/pin_types/#{pin_type.id}")
      assert json_response(conn, 422)["errors"]["detail"] == "Unprocessable Content"
    end

    test "forbids delete when user is muted", %{conn: conn, user: user} do
      pin_type = custom_pin_type_fixture(%{}, user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn = delete(conn, ~p"/api/pin_types/#{pin_type.id}")
      assert response(conn, 403)
    end
  end
end
