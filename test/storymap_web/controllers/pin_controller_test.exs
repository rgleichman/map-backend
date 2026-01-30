defmodule StorymapWeb.PinControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.PinsFixtures
  alias Storymap.Pins.Pin

  @create_attrs %{
    title: "some title",
    latitude: 120.5,
    longitude: 120.5
  }
  @update_attrs %{
    title: "some updated title",
    latitude: 456.7,
    longitude: 456.7
  }
  @invalid_attrs %{title: nil, latitude: nil, longitude: nil}

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "index" do
    test "lists all pins", %{conn: conn} do
      conn = get(conn, ~p"/api/pins")
      assert json_response(conn, 200)["data"] == []
    end
  end

  describe "create pin" do
    setup :register_and_log_in_user

    test "renders pin when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/api/pins", pin: @create_attrs)
      assert %{"id" => id} = json_response(conn, 201)["data"]

      conn = get(conn, ~p"/api/pins/#{id}")

      assert %{
               "id" => ^id,
               "latitude" => 120.5,
               "longitude" => 120.5,
               "title" => "some title"
             } = json_response(conn, 200)["data"]
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/api/pins", pin: @invalid_attrs)
      assert json_response(conn, 422)["errors"] != %{}
    end
  end

  describe "update pin" do
    setup [:register_and_log_in_user, :create_pin]

    test "renders pin when data is valid", %{conn: conn, pin: %Pin{id: id} = pin} do
      conn = put(conn, ~p"/api/pins/#{pin}", pin: @update_attrs)
      assert %{"id" => ^id} = json_response(conn, 200)["data"]

      conn = get(conn, ~p"/api/pins/#{id}")

      assert %{
               "id" => ^id,
               "latitude" => 456.7,
               "longitude" => 456.7,
               "title" => "some updated title"
             } = json_response(conn, 200)["data"]
    end

    test "renders errors when data is invalid", %{conn: conn, pin: pin} do
      conn = put(conn, ~p"/api/pins/#{pin}", pin: @invalid_attrs)
      assert json_response(conn, 422)["errors"] != %{}
    end
  end

  describe "delete pin" do
    setup [:register_and_log_in_user, :create_pin]

    test "deletes chosen pin", %{conn: conn, pin: pin} do
      conn = delete(conn, ~p"/api/pins/#{pin}")
      assert response(conn, 204)

      assert_error_sent 404, fn ->
        get(conn, ~p"/api/pins/#{pin}")
      end
    end
  end

  defp create_pin(%{conn: conn, user: user}) do
    pin = pin_fixture(%{}, user)
    %{conn: conn, pin: pin}
  end
end
