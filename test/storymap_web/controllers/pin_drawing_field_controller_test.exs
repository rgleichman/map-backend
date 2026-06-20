defmodule StorymapWeb.PinDrawingFieldControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.PinsFixtures

  @payload ~s({"version":1,"width":256,"height":256,"strokes":[]})

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "drawing field CRUD" do
    setup :register_and_log_in_user

    test "upserts payload and stores only ref in custom_data", %{conn: conn, user: user} do
      pin = drawing_pin_fixture(user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
          payload: @payload,
          format: "drawing/v1",
          version: 1
        )

      data = json_response(conn, 200)["data"]
      assert data["id"] == pin.id
      assert %{"ref" => ref} = data["custom_data"]["sketch"]
      assert is_integer(ref)

      conn = get(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch")
      blob = json_response(conn, 200)["data"]
      assert blob["payload"] == @payload
      assert blob["pin_id"] == pin.id
      assert blob["field_key"] == "sketch"
      assert blob["type"] == "drawing"

      conn = delete(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch")
      data = json_response(conn, 200)["data"]
      refute Map.has_key?(data["custom_data"], "sketch")
    end

    test "rejects non-drawing field keys", %{conn: conn, user: user} do
      pin = drawing_pin_fixture(user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/not_drawing", payload: @payload)

      assert json_response(conn, 422)["errors"]["field_key"] != []
    end

    test "allows public GET without authentication", %{conn: conn, user: user} do
      pin = drawing_pin_fixture(user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
          payload: @payload,
          format: "drawing/v1",
          version: 1
        )

      assert json_response(conn, 200)

      conn =
        build_conn()
        |> put_req_header("accept", "application/json")
        |> get(~p"/api/pins/#{pin.id}/drawing_fields/sketch")

      blob = json_response(conn, 200)["data"]
      assert blob["payload"] == @payload
    end
  end

  defp drawing_pin_fixture(user) do
    import Storymap.PinTypesFixtures

    pin_type =
      custom_pin_type_fixture(
        %{
          "schema" => %{
            "fields" => [
              %{
                "key" => "status",
                "label" => "Status",
                "type" => "select",
                "required" => true,
                "options" => [
                  %{"value" => "working", "label" => "Working"},
                  %{"value" => "broken", "label" => "Broken"}
                ]
              },
              %{"key" => "sketch", "label" => "Sketch", "type" => "drawing"}
            ]
          }
        },
        user
      )

    pin_fixture(
      %{
        "pin_type" => "custom:#{pin_type.slug}",
        "custom_data" => %{"status" => "working"}
      },
      user
    )
  end
end
