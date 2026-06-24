defmodule StorymapWeb.SubMapControllerTest do
  use StorymapWeb.ConnCase

  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures

  setup %{conn: conn} do
    {:ok, conn: put_req_header(conn, "accept", "application/json")}
  end

  describe "GET /api/sub_maps" do
    test "lists public communities", %{conn: conn} do
      sub_map = sub_map_fixture(%{"name" => "Listed"})
      conn = get(conn, ~p"/api/sub_maps")
      body = json_response(conn, 200)
      assert Enum.any?(body["data"], &(&1["community_url"] == sub_map.community_url))
    end
  end

  describe "GET /api/sub_maps/:community_url" do
    test "show response uses wire keys for pin type settings", %{conn: conn} do
      import Storymap.PinTypesFixtures

      owner = user_fixture()
      pin_type = custom_pin_type_fixture(%{}, owner)
      sub_map = sub_map_fixture(%{"community_url" => "wire-keys-show"}, owner)

      {:ok, sub_map} =
        Storymap.SubMaps.update_pin_type_settings(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "enabled_builtin_pin_types" => ["other"],
            "enabled_custom_pin_types" => [pin_type.slug]
          }
        )

      conn = get(conn, ~p"/api/sub_maps/#{sub_map.community_url}")
      data = json_response(conn, 200)["data"]

      assert data["enabled_builtin_pin_types"] == ["other"]
      assert data["enabled_custom_pin_types"] == [pin_type.slug]
      assert is_list(data["available_custom_pin_types"])
      refute Map.has_key?(data, "enabled_custom_slugs")
    end
  end

  describe "POST /api/sub_maps" do
    setup :register_and_log_in_user

    test "creates community", %{conn: conn} do
      conn =
        post(conn, ~p"/api/sub_maps", %{
          sub_map: %{
            name: "My BBQ Map",
            community_url: "my-bbq",
            contribution_mode: "open"
          }
        })

      assert %{"community_url" => "my-bbq"} = json_response(conn, 201)["data"]
    end

    test "forbids create when user is muted", %{conn: conn, user: user} do
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        post(conn, ~p"/api/sub_maps", %{
          sub_map: %{
            name: "Muted Map",
            community_url: "muted-map",
            contribution_mode: "open"
          }
        })

      assert json_response(conn, 403)["errors"] != %{}
    end
  end

  describe "community pins" do
    setup :register_and_log_in_user

    test "POST pin in community", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "pin-api-test"}, user)

      conn =
        post(conn, ~p"/api/sub_maps/#{sub_map.community_url}/pins", %{
          pin: %{
            title: "Joe's BBQ",
            latitude: 30.27,
            longitude: -97.74,
            pin_type: "other"
          }
        })

      body = json_response(conn, 201)["data"]
      assert %{"title" => "Joe's BBQ"} = body
      assert "community:pin-api-test" in body["tags"]
      assert body["community"] == %{"community_url" => "pin-api-test", "name" => sub_map.name}
    end

    test "PATCH updates community settings for owner", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "patch-test", "name" => "Before"}, user)

      conn =
        patch(conn, ~p"/api/sub_maps/#{sub_map.community_url}", %{
          sub_map: %{name: "After", description: "Updated"}
        })

      body = json_response(conn, 200)["data"]
      assert body["name"] == "After"
      assert body["description"] == "Updated"
    end

    test "PATCH forbidden when owner is muted", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "muted-patch", "name" => "Before"}, user)
      user = muted_user_fixture(user)
      conn = log_in_user(conn, user)

      conn =
        patch(conn, ~p"/api/sub_maps/#{sub_map.community_url}", %{
          sub_map: %{name: "After"}
        })

      assert json_response(conn, 403)["errors"] != %{}
    end
  end

  describe "GET /api/sub_maps/:community_url/pins" do
    test "lists approved pins for anonymous viewers", %{conn: conn} do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "pins-anon"},
          owner
        )

      contributor = user_fixture()

      {:ok, pending_pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          %{
            "title" => "Approved Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, approved_pin} =
        Storymap.SubMaps.approve_pin(
          %Storymap.Accounts.Scope{user: owner},
          sub_map,
          pending_pin.id
        )

      {:ok, pending_pin} =
        Storymap.SubMaps.create_pin_in_sub_map(
          %Storymap.Accounts.Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.1,
            "longitude" => -97.1,
            "pin_type" => "other"
          }
        )

      conn = get(conn, ~p"/api/sub_maps/#{sub_map.community_url}/pins")
      ids = Enum.map(json_response(conn, 200)["data"], & &1["id"])

      assert approved_pin.id in ids
      refute pending_pin.id in ids
    end

    test "includes pending pins for moderators", %{conn: conn} do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "pins-mod"},
          owner
        )

      contributor = user_fixture()

      {:ok, pending_pin} =
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

      conn = get(log_in_user(conn, owner), ~p"/api/sub_maps/#{sub_map.community_url}/pins")
      ids = Enum.map(json_response(conn, 200)["data"], & &1["id"])

      assert pending_pin.id in ids
    end
  end

  describe "POST /api/sub_maps/:community_url/memberships" do
    setup :register_and_log_in_user

    test "joins a community and returns membership", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "join-test"})

      conn = post(conn, ~p"/api/sub_maps/#{sub_map.community_url}/memberships")
      data = json_response(conn, 200)["data"]

      assert data == %{"role" => "member", "status" => "active"}
      assert Storymap.SubMaps.get_membership(sub_map.id, user.id)
    end

    test "requires authentication", _context do
      sub_map = sub_map_fixture(%{"community_url" => "join-auth"})

      conn =
        build_conn()
        |> put_req_header("accept", "application/json")
        |> post(~p"/api/sub_maps/#{sub_map.community_url}/memberships")

      assert json_response(conn, 401)["errors"]["detail"] == "Unauthorized"
    end
  end

  describe "DELETE /api/sub_maps/:community_url/memberships/me" do
    setup :register_and_log_in_user

    test "member can leave a community", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "leave-test"})
      {:ok, _} = Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: user}, sub_map)

      conn = delete(conn, ~p"/api/sub_maps/#{sub_map.community_url}/memberships/me")
      assert response(conn, 204) == ""
      refute Storymap.SubMaps.get_membership(sub_map.id, user.id)
    end

    test "owner cannot leave", %{conn: conn, user: user} do
      sub_map = sub_map_fixture(%{"community_url" => "leave-owner"}, user)

      conn = delete(conn, ~p"/api/sub_maps/#{sub_map.community_url}/memberships/me")
      assert json_response(conn, 403)["errors"]["detail"] == "Forbidden"
    end
  end

  describe "POST /api/sub_maps/:community_url/pins/:id/approve" do
    setup :register_and_log_in_user

    test "owner approves a pending pin", %{conn: conn, user: owner} do
      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "approve-api"},
          owner
        )

      contributor = user_fixture()

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

      conn =
        post(
          log_in_user(conn, owner),
          ~p"/api/sub_maps/#{sub_map.community_url}/pins/#{pin.id}/approve"
        )

      body = json_response(conn, 200)["data"]
      assert body["id"] == pin.id
      assert body["status"] == "approved"
    end

    test "forbids approve for non-moderators", %{conn: conn, user: member} do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "approve-deny"},
          owner
        )

      contributor = user_fixture()

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

      {:ok, _} = Storymap.SubMaps.join(%Storymap.Accounts.Scope{user: member}, sub_map)

      conn =
        post(
          log_in_user(conn, member),
          ~p"/api/sub_maps/#{sub_map.community_url}/pins/#{pin.id}/approve"
        )

      assert json_response(conn, 403)["errors"]["detail"] == "Forbidden"
    end
  end

  describe "POST /api/sub_maps/:community_url/pins/:id/reject" do
    setup :register_and_log_in_user

    test "owner rejects a pending pin", %{conn: conn, user: owner} do
      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "reject-api"},
          owner
        )

      contributor = user_fixture()

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

      conn =
        post(
          log_in_user(conn, owner),
          ~p"/api/sub_maps/#{sub_map.community_url}/pins/#{pin.id}/reject"
        )

      body = json_response(conn, 200)["data"]
      assert body["id"] == pin.id
      assert body["status"] == "rejected"
    end
  end
end
