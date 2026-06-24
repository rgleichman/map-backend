defmodule StorymapWeb.PinMusicFieldControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  @payload "tempo=120;seq=kick,snare,hihat"

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "music field CRUD" do
    setup :register_and_log_in_user

    test "upserts payload and stores only ref in custom_data", %{conn: conn, user: user} do
      pin = music_pin_fixture(user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/music_fields/song",
          music_field: %{payload: @payload, format: "music/v1", version: 1}
        )

      data = json_response(conn, 200)["data"]
      assert data["id"] == pin.id
      assert %{"ref" => ref} = data["custom_data"]["song"]
      assert is_integer(ref)

      conn = get(conn, ~p"/api/pins/#{pin.id}/music_fields/song")
      blob = json_response(conn, 200)["data"]
      assert blob["payload"] == @payload
      assert blob["pin_id"] == pin.id
      assert blob["field_key"] == "song"
      assert blob["type"] == "music"

      conn = delete(conn, ~p"/api/pins/#{pin.id}/music_fields/song")
      data = json_response(conn, 200)["data"]
      refute Map.has_key?(data["custom_data"], "song")
    end

    test "rejects non-music field keys", %{conn: conn, user: user} do
      pin = music_pin_fixture(user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/music_fields/not_music",
          music_field: %{payload: @payload}
        )

      assert json_response(conn, 422)["errors"]["field_key"] != []
    end

    test "forbids upsert when user is muted", %{conn: conn, user: user} do
      pin = music_pin_fixture(user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/music_fields/song",
          music_field: %{payload: @payload, format: "music/v1", version: 1}
        )

      assert json_response(conn, 403)["errors"] != %{}
    end

    test "updates blob via PUT", %{conn: conn, user: user} do
      pin = music_pin_fixture(user)

      post(conn, ~p"/api/pins/#{pin.id}/music_fields/song",
        music_field: %{payload: @payload, format: "music/v1", version: 1}
      )

      conn =
        put(conn, ~p"/api/pins/#{pin.id}/music_fields/song",
          music_field: %{payload: "tempo=140", format: "music/v1", version: 2}
        )

      assert json_response(conn, 200)["data"]["custom_data"]["song"]["ref"]

      conn = get(conn, ~p"/api/pins/#{pin.id}/music_fields/song")
      assert json_response(conn, 200)["data"]["payload"] == "tempo=140"
    end

    test "rejects blob upsert on non-custom pin type", %{conn: conn, user: user} do
      pin = pin_fixture(%{"pin_type" => "one_time"}, user)

      conn =
        post(conn, ~p"/api/pins/#{pin.id}/music_fields/song",
          music_field: %{payload: @payload, format: "music/v1", version: 1}
        )

      assert json_response(conn, 422)["errors"]["field_key"] != []
    end

    test "forbids deleting required music field", %{conn: conn, user: user} do
      pin = required_music_pin_fixture(user)

      post(conn, ~p"/api/pins/#{pin.id}/music_fields/song",
        music_field: %{payload: @payload, format: "music/v1", version: 1}
      )

      conn = delete(conn, ~p"/api/pins/#{pin.id}/music_fields/song")
      assert json_response(conn, 422)["errors"]["field_key"] != []
    end
  end

  describe "show authorization" do
    setup :register_and_log_in_user

    test "returns 404 for pending sub-map pin when anonymous", %{user: owner} do
      import Storymap.SubMapsFixtures

      contributor = user_fixture()
      {pin, _sub_map} = pending_sub_map_music_pin(owner, contributor)

      contributor_conn = log_in_user(json_conn(), contributor)

      assert json_response(
               post(contributor_conn, ~p"/api/pins/#{pin.id}/music_fields/song",
                 music_field: %{payload: @payload, format: "music/v1", version: 1}
               ),
               200
             )

      assert json_response(get(json_conn(), ~p"/api/pins/#{pin.id}/music_fields/song"), 404)
    end
  end

  defp json_conn do
    build_conn() |> put_req_header("accept", "application/json")
  end

  defp pending_sub_map_music_pin(owner, contributor) do
    import Storymap.PinTypesFixtures
    import Storymap.SubMapsFixtures

    alias Storymap.Accounts.Scope

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
              %{"key" => "song", "label" => "Song", "type" => "music"}
            ]
          }
        },
        owner
      )

    sub_map =
      sub_map_fixture(
        %{
          "contribution_mode" => "approval_required",
          "community_url" => "music-blob-auth-#{System.unique_integer([:positive])}"
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
          "title" => "Pending song",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "custom:#{pin_type.slug}",
          "custom_data" => %{"status" => "working"}
        }
      )

    {pin, sub_map}
  end

  defp music_pin_fixture(user) do
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
              %{"key" => "song", "label" => "Song", "type" => "music"}
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

  defp required_music_pin_fixture(user) do
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
              %{"key" => "song", "label" => "Song", "type" => "music", "required" => true}
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
