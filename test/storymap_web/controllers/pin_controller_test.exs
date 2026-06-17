defmodule StorymapWeb.PinControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.PinsFixtures
  alias Storymap.Pins.Pin

  @create_attrs %{
    title: "some title",
    latitude: 120.5,
    longitude: 120.5,
    pin_type: "one_time"
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

    test "includes community metadata for promoted community pins", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"community_url" => "json-community", "name" => "JSON Community"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Community Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other",
            "visible_on_world_map" => true
          }
        )

      conn = get(conn, ~p"/api/pins")
      [listed] = json_response(conn, 200)["data"]

      assert listed["id"] == pin.id

      assert listed["community"] == %{
               "community_url" => "json-community",
               "name" => "JSON Community"
             }
    end
  end

  describe "create pin" do
    setup :register_and_log_in_user

    test "records pin_created admin activity event", %{conn: conn, user: user} do
      import Ecto.Query

      title = "admin-audit-create-#{System.unique_integer([:positive])}"
      attrs = Map.put(@create_attrs, :title, title)

      conn = post(conn, ~p"/api/pins", pin: attrs)
      assert %{"id" => pin_id} = json_response(conn, 201)["data"]

      event =
        Storymap.Repo.one!(
          from(e in Storymap.AdminActivity.Event,
            where:
              e.type == "pin_created" and
                e.actor_user_id == ^user.id and
                fragment("?->>'title' = ?", e.metadata, ^title),
            order_by: [desc: e.id],
            limit: 1
          )
        )

      assert event.metadata["pin_id"] == pin_id
    end

    test "renders pin when data is valid", %{conn: conn} do
      conn = post(conn, ~p"/api/pins", pin: @create_attrs)
      assert %{"id" => id} = json_response(conn, 201)["data"]

      conn = get(conn, ~p"/api/pins/#{id}")

      data = json_response(conn, 200)["data"]

      assert %{
               "id" => ^id,
               "latitude" => 120.5,
               "longitude" => 120.5,
               "title" => "some title",
               "pin_type" => "one_time"
             } = data

      refute Map.has_key?(data, "community")
    end

    test "renders errors when data is invalid", %{conn: conn} do
      conn = post(conn, ~p"/api/pins", pin: @invalid_attrs)
      assert json_response(conn, 422)["errors"] != %{}
    end

    test "forbids create when user is muted", %{conn: conn, user: user} do
      user =
        Storymap.Repo.update!(Ecto.Changeset.change(user, muted_at: DateTime.utc_now(:second)))

      conn = log_in_user(conn, user)

      conn = post(conn, ~p"/api/pins", pin: @create_attrs)
      assert json_response(conn, 403)["errors"] != %{}
    end

    test "creates world pin with custom type", %{conn: conn} do
      import Storymap.PinTypesFixtures

      pin_type = custom_pin_type_fixture()

      conn =
        post(conn, ~p"/api/pins", %{
          pin: %{
            title: "Arcade pin",
            latitude: 30.0,
            longitude: -97.0,
            pin_type: "custom:#{pin_type.slug}",
            custom_data: %{"status" => "working"}
          }
        })

      data = json_response(conn, 201)["data"]
      assert data["pin_type"] == "custom:#{pin_type.slug}"
      assert data["custom_data"]["status"] == "working"
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

    test "records pin_updated admin activity event with diff", %{conn: conn, pin: pin} do
      import Ecto.Query

      conn = put(conn, ~p"/api/pins/#{pin}", pin: @update_attrs)
      assert json_response(conn, 200)

      event =
        Storymap.Repo.one!(
          from(e in Storymap.AdminActivity.Event,
            where:
              e.type == "pin_updated" and
                fragment("(?->>'pin_id')::integer = ?", e.metadata, ^pin.id),
            order_by: [desc: e.id],
            limit: 1
          )
        )

      assert %{"changes" => changes} = event.metadata["diff"]
      assert Map.has_key?(changes, "title")
    end

    test "renders errors when data is invalid", %{conn: conn, pin: pin} do
      conn = put(conn, ~p"/api/pins/#{pin}", pin: @invalid_attrs)
      assert json_response(conn, 422)["errors"] != %{}
    end

    test "allows admin to update any pin", %{conn: conn} do
      owner = Storymap.AccountsFixtures.user_fixture()
      pin = pin_fixture(%{}, owner)
      admin = Storymap.AccountsFixtures.user_fixture()
      admin = Storymap.Repo.update!(Ecto.Changeset.change(admin, admin_level: 1))
      conn = log_in_user(conn, admin)

      conn = put(conn, ~p"/api/pins/#{pin}", pin: @update_attrs)
      assert %{"id" => id} = json_response(conn, 200)["data"]
      assert id == pin.id
    end

    test "forbids update when user is muted", %{conn: conn, user: user, pin: pin} do
      user =
        Storymap.Repo.update!(Ecto.Changeset.change(user, muted_at: DateTime.utc_now(:second)))

      conn = log_in_user(conn, user)

      conn = put(conn, ~p"/api/pins/#{pin}", pin: @update_attrs)
      assert json_response(conn, 403)["errors"] != %{}
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

    test "allows admin to delete any pin", %{conn: conn} do
      owner = Storymap.AccountsFixtures.user_fixture()
      pin = pin_fixture(%{}, owner)
      admin = Storymap.AccountsFixtures.user_fixture()
      admin = Storymap.Repo.update!(Ecto.Changeset.change(admin, admin_level: 1))
      conn = log_in_user(conn, admin)

      conn = delete(conn, ~p"/api/pins/#{pin}")
      assert response(conn, 204)
    end

    test "forbids delete when user is muted", %{conn: conn, user: user, pin: pin} do
      user =
        Storymap.Repo.update!(Ecto.Changeset.change(user, muted_at: DateTime.utc_now(:second)))

      conn = log_in_user(conn, user)

      conn = delete(conn, ~p"/api/pins/#{pin}")
      assert json_response(conn, 403)["errors"] != %{}
    end
  end

  defp create_pin(%{conn: conn, user: user}) do
    pin = pin_fixture(%{}, user)
    %{conn: conn, pin: pin}
  end
end
