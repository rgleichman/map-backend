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

  describe "show pin" do
    test "returns approved world pin for anonymous users", %{conn: conn} do
      pin = pin_fixture()
      conn = get(conn, ~p"/api/pins/#{pin.id}")
      assert json_response(conn, 200)["data"]["id"] == pin.id
    end

    test "returns sub-map-only approved pin for anonymous users", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Local only",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      conn = get(conn, ~p"/api/pins/#{pin.id}")
      assert json_response(conn, 200)["data"]["id"] == pin.id
    end

    test "returns 404 for pending pin when anonymous", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      contributor = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-pending"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      assert pin.status == :pending
      assert json_response(get(conn, ~p"/api/pins/#{pin.id}"), 404)
    end

    test "returns pending pin for owner", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      contributor = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-owner"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      conn = log_in_user(conn, contributor)
      assert json_response(get(conn, ~p"/api/pins/#{pin.id}"), 200)["data"]["id"] == pin.id
    end

    test "returns pending pin for community mod", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      contributor = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-mod"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      conn = log_in_user(conn, owner)
      assert json_response(get(conn, ~p"/api/pins/#{pin.id}"), 200)["data"]["id"] == pin.id
    end

    test "returns 404 for rejected pin when anonymous", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      contributor = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-rejected"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Rejected Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, _} =
        Storymap.SubMaps.reject_pin(%Storymap.Accounts.Scope{user: owner}, sub_map, pin.id)

      assert json_response(get(conn, ~p"/api/pins/#{pin.id}"), 404)
    end

    test "returns rejected pin for community mod", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      contributor = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-rejected-mod"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Rejected Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, _} =
        Storymap.SubMaps.reject_pin(%Storymap.Accounts.Scope{user: owner}, sub_map, pin.id)

      conn = log_in_user(conn, owner)
      assert json_response(get(conn, ~p"/api/pins/#{pin.id}"), 200)["data"]["id"] == pin.id
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

    test "ignores sub_map_id, status, and visible_on_world_map on world create", %{conn: conn} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      sub_map = sub_map_fixture(%{"community_url" => "attack-target"}, owner)

      conn =
        post(conn, ~p"/api/pins",
          pin:
            Map.merge(@create_attrs, %{
              sub_map_id: sub_map.id,
              status: "pending",
              visible_on_world_map: false
            })
        )

      data = json_response(conn, 201)["data"]
      assert data["status"] == "approved"
      assert data["visible_on_world_map"] == true
      refute Map.has_key?(data, "community")

      pin = Storymap.Pins.get_pin!(data["id"])
      assert is_nil(pin.sub_map_id)
      assert pin.status == :approved
      assert pin.visible_on_world_map == true
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

  describe "pin mass-assignment regression" do
    setup :register_and_log_in_user

    test "pin owner cannot self-approve pending sub-map pin via update", %{conn: conn, user: user} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "mass-assign-status"},
          owner
        )

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: user},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      assert pin.status == :pending

      conn =
        put(conn, ~p"/api/pins/#{pin.id}",
          pin: %{
            "title" => "Still pending",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other",
            "status" => "approved"
          }
        )

      assert json_response(conn, 200)["data"]["status"] == "pending"
      assert Storymap.Pins.get_pin!(pin.id).status == :pending
    end

    test "pin owner cannot move pin between sub-maps via update", %{conn: conn, user: user} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      sub_map_a = sub_map_fixture(%{"community_url" => "mass-assign-a"}, owner)
      sub_map_b = sub_map_fixture(%{"community_url" => "mass-assign-b"}, owner)

      {:ok, pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: user},
          sub_map_a,
          %{
            "title" => "Pinned A",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      assert pin.sub_map_id == sub_map_a.id

      conn =
        put(conn, ~p"/api/pins/#{pin.id}",
          pin: %{
            "title" => "Try move",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other",
            "sub_map_id" => sub_map_b.id
          }
        )

      data = json_response(conn, 200)["data"]
      assert data["community"]["community_url"] == sub_map_a.community_url

      pin = Storymap.Pins.get_pin!(pin.id)
      assert pin.sub_map_id == sub_map_a.id
    end
  end

  describe "delete pin" do
    setup [:register_and_log_in_user, :create_pin]

    test "deletes chosen pin", %{conn: conn, pin: pin} do
      conn = delete(conn, ~p"/api/pins/#{pin}")
      assert response(conn, 204)

      conn = get(conn, ~p"/api/pins/#{pin}")
      assert json_response(conn, 404)["errors"] != %{}
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

  describe "pin linking" do
    setup :register_and_log_in_user

    test "round-trips explicit linked_pin_ids", %{conn: conn, user: user} do
      target = pin_fixture(%{"title" => "Target Pin"}, user)
      source = pin_fixture(%{"title" => "Source Pin"}, user)

      conn =
        put(conn, ~p"/api/pins/#{source.id}",
          pin: %{
            "title" => source.title,
            "linked_pin_ids" => [target.id]
          }
        )

      data = json_response(conn, 200)["data"]
      assert [%{"pin_id" => target_id, "source_field" => nil}] = data["linked_pins"]
      assert target_id == target.id
    end

    test "extracts text reference from description on save", %{conn: conn, user: user} do
      target = pin_fixture(%{"title" => "Linked Target"}, user)
      source = pin_fixture(%{"title" => "Source"}, user)
      origin = Storymap.Pins.ReferenceParser.default_origin()

      conn =
        put(conn, ~p"/api/pins/#{source.id}",
          pin: %{
            "title" => source.title,
            "description" => "See #{origin}/map?pin=#{target.id}",
            "linked_pin_ids" => []
          }
        )

      data = json_response(conn, 200)["data"]

      assert Enum.any?(data["linked_pins"], fn link ->
               link["pin_id"] == target.id and link["source_field"] == "description"
             end)
    end

    test "returns backlinks for target pin", %{conn: conn, user: user} do
      target = pin_fixture(%{"title" => "Backlink Target"}, user)
      source = pin_fixture(%{"title" => "Backlink Source"}, user)

      conn =
        put(conn, ~p"/api/pins/#{source.id}",
          pin: %{
            "title" => source.title,
            "linked_pin_ids" => [target.id]
          }
        )

      assert json_response(conn, 200)

      conn = get(conn, ~p"/api/pins/#{target.id}/backlinks")
      data = json_response(conn, 200)["data"]

      assert [%{"pin_id" => source_id, "source_field" => nil}] = data
      assert source_id == source.id
    end

    test "rejects self-link", %{conn: conn, user: user} do
      pin = pin_fixture(%{}, user)

      conn =
        put(conn, ~p"/api/pins/#{pin.id}",
          pin: %{
            "title" => pin.title,
            "linked_pin_ids" => [pin.id]
          }
        )

      assert json_response(conn, 422)["errors"]["linked_pin_ids"] != []
    end

    test "rejects link to pending pin", %{conn: conn, user: user} do
      import Storymap.SubMapsFixtures

      owner = Storymap.AccountsFixtures.user_fixture()
      contributor = Storymap.AccountsFixtures.user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "link-pending"},
          owner
        )

      {:ok, pending} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      source = pin_fixture(%{}, user)

      conn =
        put(conn, ~p"/api/pins/#{source.id}",
          pin: %{
            "title" => source.title,
            "linked_pin_ids" => [pending.id]
          }
        )

      assert json_response(conn, 422)["errors"]["linked_pin_ids"] != []
    end

    test "dedupes explicit and text refs to same target", %{conn: conn, user: user} do
      target = pin_fixture(%{"title" => "Dedup Target"}, user)
      source = pin_fixture(%{"title" => "Dedup Source"}, user)
      origin = Storymap.Pins.ReferenceParser.default_origin()

      conn =
        put(conn, ~p"/api/pins/#{source.id}",
          pin: %{
            "title" => source.title,
            "description" => "See #{origin}/map?pin=#{target.id}",
            "linked_pin_ids" => [target.id]
          }
        )

      data = json_response(conn, 200)["data"]
      target_links = Enum.filter(data["linked_pins"], &(&1["pin_id"] == target.id))
      assert length(target_links) == 1
      assert hd(target_links)["source_field"] == nil
    end
  end

  defp create_pin(%{conn: conn, user: user}) do
    pin = pin_fixture(%{}, user)
    %{conn: conn, pin: pin}
  end
end
