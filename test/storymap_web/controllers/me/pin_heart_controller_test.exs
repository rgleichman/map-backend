defmodule StorymapWeb.Me.PinHeartControllerTest do
  use StorymapWeb.ConnCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.PinsFixtures

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "index" do
    setup :register_and_log_in_user

    test "lists hearted pin ids", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      pin_heart_fixture(user, pin)

      conn = get(conn, ~p"/api/me/pin_hearts")
      assert json_response(conn, 200)["data"] == [pin.id]
    end

    test "forbids muted user", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      pin_heart_fixture(user, pin)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn = get(conn, ~p"/api/me/pin_hearts")
      assert json_response(conn, 403)
    end
  end

  describe "pins" do
    setup :register_and_log_in_user

    test "lists hearted pins", %{conn: conn, user: user} do
      pin = pin_fixture(%{"title" => "Saved spot"}, user)
      pin_heart_fixture(user, pin)

      conn = get(conn, ~p"/api/me/pin_hearts/pins")
      data = json_response(conn, 200)["data"]
      assert length(data) == 1
      assert hd(data)["id"] == pin.id
      assert hd(data)["title"] == "Saved spot"
      assert Map.has_key?(hd(data), "is_owner")
      refute Map.has_key?(hd(data), "user_id")
    end

    test "forbids muted user", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)
      pin_heart_fixture(user, pin)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn = get(conn, ~p"/api/me/pin_hearts/pins")
      assert json_response(conn, 403)
    end
  end
end
