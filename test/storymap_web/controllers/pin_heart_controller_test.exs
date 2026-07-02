defmodule StorymapWeb.PinHeartControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "create" do
    setup :register_and_log_in_user

    test "hearts a visible pin", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)

      conn = post(conn, ~p"/api/pins/#{pin.id}/heart")
      assert response(conn, 201) == ""
      assert Storymap.Pins.Hearts.hearted?(user, pin)
    end

    test "is idempotent", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)

      conn = post(conn, ~p"/api/pins/#{pin.id}/heart")
      assert response(conn, 201) == ""

      conn = post(conn, ~p"/api/pins/#{pin.id}/heart")
      assert response(conn, 201) == ""
    end

    test "returns 401 when unauthenticated", %{conn: conn} do
      pin = pin_fixture()
      conn = recycle(conn) |> delete_req_header("authorization")

      conn = post(conn, ~p"/api/pins/#{pin.id}/heart")
      assert json_response(conn, 401)
    end

    test "forbids muted user", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn = post(conn, ~p"/api/pins/#{pin.id}/heart")
      assert json_response(conn, 403)
    end

    test "returns 404 for hidden pin", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = user_fixture()
      sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Hidden",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Storymap.Repo.update!(Ecto.Changeset.change(pin, status: :rejected))

      conn = post(conn, ~p"/api/pins/#{pin.id}/heart")
      assert json_response(conn, 404)
    end
  end

  describe "delete" do
    setup :register_and_log_in_user

    test "unhearts a pin", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      {:ok, _} = Storymap.Pins.Hearts.heart(user, pin)

      conn = delete(conn, ~p"/api/pins/#{pin.id}/heart")
      assert response(conn, 204) == ""
      refute Storymap.Pins.Hearts.hearted?(user, pin)
    end

    test "unhearts a pin the user can no longer view", %{conn: conn, user: user} do
      import Storymap.SubMapsFixtures

      owner = user_fixture()
      sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Hidden",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, _} = Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: user}, sub_map)
      {:ok, _} = Storymap.Pins.Hearts.heart(user, pin)

      pin = Storymap.Repo.update!(Ecto.Changeset.change(pin, status: :rejected))

      conn = delete(conn, ~p"/api/pins/#{pin.id}/heart")
      assert response(conn, 204) == ""
      refute Storymap.Pins.Hearts.hearted?(user, pin)
    end
  end

  describe "me index" do
    setup :register_and_log_in_user

    test "lists hearted pin ids", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      {:ok, _} = Storymap.Pins.Hearts.heart(user, pin)

      conn = get(conn, ~p"/api/me/pin_hearts")
      assert json_response(conn, 200)["data"] == [pin.id]
    end
  end
end
