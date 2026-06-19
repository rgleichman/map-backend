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
end
