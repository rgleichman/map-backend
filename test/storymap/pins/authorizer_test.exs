defmodule Storymap.Pins.AuthorizerTest do
  use Storymap.DataCase, async: true

  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins.Authorizer
  alias Storymap.Pins.Pin
  alias Storymap.Repo
  alias Storymap.SubMaps

  describe "authorize_create_in_sub_map/3" do
    test "forbids muted user in sub-map" do
      owner = user_fixture()
      muted = muted_user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-muted-create"},
          owner
        )

      refute Authorizer.authorize_create_in_sub_map(muted, sub_map, nil) == :ok
      assert {:error, :forbidden} = Authorizer.authorize_create_in_sub_map(muted, sub_map, nil)
    end
  end

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

    test "forbids rejected pin for non-moderator member" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-rejected"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Rejected Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, rejected} = SubMaps.reject_pin(%Scope{user: owner}, sub_map, pin.id)
      pin = Repo.preload(rejected, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, contributor.id)

      assert {:error, :not_found} =
               Authorizer.authorize_show(contributor, pin,
                 sub_map: sub_map,
                 membership: membership
               )
    end

    test "allows rejected pin for community mod" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "show-rejected-mod"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Rejected Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, rejected} = SubMaps.reject_pin(%Scope{user: owner}, sub_map, pin.id)
      pin = Repo.preload(rejected, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, owner.id)

      assert :ok = Authorizer.authorize_show(owner, pin, sub_map: sub_map, membership: membership)
    end

    test "forbids archived pin for non-moderator member" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "show-archived"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Archived Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, approved} = SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)

      archived =
        Repo.update!(Ecto.Changeset.change(approved, status: :archived))
        |> Repo.preload(:sub_map)

      membership = SubMaps.get_membership(sub_map.id, contributor.id)

      assert {:error, :not_found} =
               Authorizer.authorize_show(contributor, archived,
                 sub_map: sub_map,
                 membership: membership
               )
    end

    test "allows archived pin for community mod" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "show-archived-mod"},
          owner
        )

      {:ok, pin} =
        SubMaps.create_pin_in_sub_map(
          %Scope{user: contributor},
          sub_map,
          %{
            "title" => "Archived Spot",
            "latitude" => 30.0,
            "longitude" => -97.0,
            "pin_type" => "other"
          }
        )

      {:ok, approved} = SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)

      archived =
        Repo.update!(Ecto.Changeset.change(approved, status: :archived))
        |> Repo.preload(:sub_map)

      membership = SubMaps.get_membership(sub_map.id, owner.id)

      assert :ok =
               Authorizer.authorize_show(owner, archived,
                 sub_map: sub_map,
                 membership: membership
               )
    end
  end

  describe "authorize_update/3 world vs sub-map routing" do
    test "routes world pins to Pins.Policy" do
      import Storymap.PinsFixtures

      owner = user_fixture()
      other = user_fixture()
      pin = pin_fixture(%{}, owner)

      assert :ok = Authorizer.authorize_update(owner, pin, [])
      assert {:error, :forbidden} = Authorizer.authorize_update(other, pin, [])
    end

    test "routes sub-map pins to sub-map policy" do
      owner = user_fixture()
      contributor = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "auth-route-update"},
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

    test "forbids muted owner editing sub-map pin" do
      owner = user_fixture()
      muted = muted_user_fixture(owner)

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-muted-update"},
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

      assert {:error, :forbidden} = Authorizer.authorize_update(muted, pin, opts)
    end
  end

  describe "can_edit_in_json?/3" do
    test "returns false when update is forbidden" do
      owner = user_fixture()
      other = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "approval_required", "community_url" => "auth-json-edit"},
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

      {:ok, approved} = SubMaps.approve_pin(%Scope{user: owner}, sub_map, pin.id)
      pin = Repo.preload(approved, :sub_map)
      membership = SubMaps.get_membership(sub_map.id, other.id)
      opts = [sub_map: sub_map, membership: membership]

      refute Authorizer.can_edit_in_json?(other, pin, opts)
    end

    test "returns true when update is allowed" do
      owner = user_fixture()

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-json-ok"},
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

      assert Authorizer.can_edit_in_json?(owner, pin, opts)
    end
  end

  describe "authorize_delete/3 world vs sub-map routing" do
    test "routes world pins to Pins.Policy" do
      import Storymap.PinsFixtures

      owner = user_fixture()
      other = user_fixture()
      pin = pin_fixture(%{}, owner)

      assert :ok = Authorizer.authorize_delete(owner, pin, [])
      assert {:error, :forbidden} = Authorizer.authorize_delete(other, pin, [])
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

    test "forbids muted owner deleting sub-map pin" do
      owner = user_fixture()
      muted = muted_user_fixture(owner)

      sub_map =
        sub_map_fixture(
          %{"contribution_mode" => "open", "community_url" => "auth-muted-delete"},
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

      assert {:error, :forbidden} = Authorizer.authorize_delete(muted, pin, opts)
    end
  end
end
