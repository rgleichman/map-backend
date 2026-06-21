defmodule Storymap.Pins.AuthorizerTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins.Authorizer
  alias Storymap.Pins.Pin
  alias Storymap.Repo
  alias Storymap.SubMaps

  describe "authorize_show/3" do
    test "allows world-visible approved pin for anonymous viewer" do
      import Storymap.PinsFixtures

      pin = pin_fixture()
      assert :ok = Authorizer.authorize_show(nil, pin, [])
    end

    test "allows sub-map-only approved pin for anonymous viewer" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"promote_to_world_default" => "never", "community_url" => "show-local"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Local only",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      assert :ok = Authorizer.authorize_show(nil, pin, sub_map: sub_map)
    end

    test "forbids pending pin for anonymous viewer" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-auth-pending"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      assert {:error, :not_found} = Authorizer.authorize_show(nil, pin, sub_map: sub_map)
    end

    test "allows pending pin for owner" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-auth-owner"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, contributor.id)
      opts = [sub_map: sub_map, membership: membership]

      assert :ok = Authorizer.authorize_show(contributor, pin, opts)
    end

    test "allows pending pin for community mod" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-auth-mod"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Pending Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, owner.id)
      opts = [sub_map: sub_map, membership: membership]

      assert :ok = Authorizer.authorize_show(owner, pin, opts)
    end

    test "allows site pin moderator to view non-world-visible pin" do
      owner = user_fixture()
      admin = user_fixture()
      admin = Repo.update!(Ecto.Changeset.change(admin, admin_level: 1))

      sub_map =
        sub_map_fixture(
          %{"promote_to_world_default" => "never", "community_url" => "show-auth-admin"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Local only",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      assert :ok = Authorizer.authorize_show(admin, pin, sub_map: sub_map)
    end
  end

  describe "authorize_update/3 for sub-map pins" do
    test "forbids owner editing approved pin in approval_required community" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "auth-update"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, approved} = SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)
      pin = Repo.preload(approved, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, contributor.id)
      opts = [sub_map: sub_map, membership: membership]

      assert {:error, :forbidden} = Authorizer.authorize_update(contributor, pin, opts)
    end

    test "allows owner editing pending pin in approval_required community" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "auth-pending"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, contributor.id)
      opts = [sub_map: sub_map, membership: membership]

      assert :ok = Authorizer.authorize_update(contributor, pin, opts)
    end

    test "forbids owner editing approved pin when sub_map is not loaded" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "auth-notloaded"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, approved} = SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)
      pin = Repo.get!(Pin, approved.id)

      assert {:error, :forbidden} = Authorizer.authorize_update(contributor, pin, [])
    end

    test "authorize_update does not raise when sub_map association is not loaded" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-no-raise"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.get!(Pin, pin.id)
      refute Ecto.assoc_loaded?(pin.sub_map)

      assert :ok = Authorizer.authorize_update(owner, pin, [])
    end

    test "allows owner editing approved pin in open community via preloaded association" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-preload"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)

      assert :ok = Authorizer.authorize_update(owner, pin, [])
    end

    test "allows owner editing approved pin in open community" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-open"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: owner},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      pin = Repo.preload(pin, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, owner.id)
      opts = [sub_map: sub_map, membership: membership]

      assert :ok = Authorizer.authorize_update(owner, pin, opts)
    end
  end

  describe "authorize_delete/3 for sub-map pins" do
    test "allows owner deleting approved pin in approval_required community" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "auth-delete"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, approved} = SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)
      pin = Repo.preload(approved, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, contributor.id)
      opts = [sub_map: sub_map, membership: membership]

      assert :ok = Authorizer.authorize_delete(contributor, pin, opts)
    end
  end
end
