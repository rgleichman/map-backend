defmodule StorymapWeb.PinDrawingFieldControllerTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope

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

    test "updates blob via PUT", %{conn: conn, user: user} do
      pin = drawing_pin_fixture(user)

      post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
        payload: @payload,
        format: "drawing/v1",
        version: 1
      )

      updated = ~s({"version":2,"width":128,"height":128,"strokes":[]})

      conn =
        put(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
          payload: updated,
          format: "drawing/v1",
          version: 2
        )

      assert json_response(conn, 200)["data"]["custom_data"]["sketch"]["ref"]

      conn = get(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch")
      assert json_response(conn, 200)["data"]["payload"] == updated
    end

    test "rejects blob upsert on non-custom pin type", %{conn: conn, user: user} do
      pin = pin_fixture(%{"pin_type" => "one_time"}, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch", payload: @payload)

      assert json_response(conn, 422)["errors"]["field_key"] != []
    end
  end

  describe "show authorization" do
    setup :register_and_log_in_user

    test "returns 404 for pending sub-map pin when anonymous", %{user: owner} do
      contributor = user_fixture()
      {_pin_type, _sub_map, pin} = pending_sub_map_drawing_pin(owner, contributor)

      contributor_conn = log_in_user(json_conn(), contributor)

      assert json_response(
               post(contributor_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
                 payload: @payload,
                 format: "drawing/v1",
                 version: 1
               ),
               200
             )

      assert json_response(get(json_conn(), ~p"/api/pins/#{pin.id}/drawing_fields/sketch"), 404)
    end

    test "returns blob for pending sub-map pin when owner of pin", %{user: owner} do
      contributor = user_fixture()
      {_pin_type, _sub_map, pin} = pending_sub_map_drawing_pin(owner, contributor)

      contributor_conn = log_in_user(json_conn(), contributor)

      assert json_response(
               post(contributor_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
                 payload: @payload,
                 format: "drawing/v1",
                 version: 1
               ),
               200
             )

      blob =
        json_response(get(contributor_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch"), 200)[
          "data"
        ]

      assert blob["payload"] == @payload
    end

    test "returns 404 for rejected sub-map pin when anonymous", %{user: owner} do
      contributor = user_fixture()
      {_pin_type, sub_map, pin} = pending_sub_map_drawing_pin(owner, contributor)

      contributor_conn = log_in_user(json_conn(), contributor)

      assert json_response(
               post(contributor_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
                 payload: @payload,
                 format: "drawing/v1",
                 version: 1
               ),
               200
             )

      assert {:ok, _} = Storymap.SubMaps.reject_pin(%Scope{user: owner}, sub_map, pin.id)

      assert json_response(get(json_conn(), ~p"/api/pins/#{pin.id}/drawing_fields/sketch"), 404)
    end
  end

  describe "write authorization" do
    setup :register_and_log_in_user

    test "forbids upsert when user is not pin owner", %{conn: conn} do
      owner = user_fixture()
      pin = drawing_pin_fixture(owner)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
          payload: @payload,
          format: "drawing/v1",
          version: 1
        )

      assert json_response(conn, 403)["errors"] != %{}
    end

    test "forbids delete when user is not pin owner", %{conn: conn} do
      owner = user_fixture()
      pin = drawing_pin_fixture(owner)

      owner_conn = log_in_user(json_conn(), owner)

      assert json_response(
               post(owner_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
                 payload: @payload,
                 format: "drawing/v1",
                 version: 1
               ),
               200
             )

      conn = delete(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch")
      assert json_response(conn, 403)["errors"] != %{}
    end

    test "forbids upsert on approved sub-map pin when contributor may not edit" do
      owner = user_fixture()
      contributor = user_fixture()
      {_pin_type, sub_map, pin} = pending_sub_map_drawing_pin(owner, contributor)

      contributor_conn = log_in_user(json_conn(), contributor)

      assert json_response(
               post(contributor_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
                 payload: @payload,
                 format: "drawing/v1",
                 version: 1
               ),
               200
             )

      assert {:ok, _} = Storymap.SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)

      conn =
        post(contributor_conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
          payload: @payload,
          format: "drawing/v1",
          version: 2
        )

      assert json_response(conn, 403)["errors"] != %{}
    end

    test "forbids upsert when user is muted", %{conn: conn, user: user} do
      pin = drawing_pin_fixture(user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/drawing_fields/sketch",
          payload: @payload,
          format: "drawing/v1",
          version: 1
        )

      assert json_response(conn, 403)["errors"] != %{}
    end
  end

  defp json_conn do
    build_conn() |> put_req_header("accept", "application/json")
  end

  defp pending_sub_map_drawing_pin(owner, contributor) do
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
        owner
      )

    sub_map =
      sub_map_fixture(
        %{
          "contribution_mode" => "approval_required",
          "community_url" => "blob-auth-#{System.unique_integer([:positive])}"
        },
        owner
      )

    {:ok, sub_map} =
      Storymap.SubMaps.update_pin_type_settings(%Scope{user: owner}, sub_map, %{
        "enabled_builtin_pin_types" => [],
        "enabled_custom_pin_types" => [pin_type.slug]
      })

    {:ok, pin} =
      Storymap.SubMaps.create_pin_in_sub_map(
        %Scope{user: contributor},
        sub_map,
        %{
          "title" => "Pending sketch",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "custom:#{pin_type.slug}",
          "custom_data" => %{"status" => "working"}
        }
      )

    {pin_type, sub_map, pin}
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
