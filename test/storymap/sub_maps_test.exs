defmodule Storymap.SubMapsTest do
  use Storymap.DataCase

  import Storymap.AccountsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Accounts.Scope
  alias Storymap.Pins
  alias Storymap.SubMaps

  test "create_sub_map/2 creates owner membership" do
    user = user_fixture()

    {:ok, sub_map} =
      SubMaps.create_sub_map(%Scope{user: user}, %{"name" => "BBQ", "community_url" => "bbq-test"})

    assert sub_map.owner_user_id == user.id
    assert %{} = SubMaps.get_membership(sub_map.id, user.id)
  end

  test "list_public/1 finds by query" do
    sub_map_fixture(%{"name" => "Austin BBQ", "community_url" => "austin-bbq"})
    assert [_] = SubMaps.list_public(q: "bbq")
  end

  test "create_pin_in_sub_map/3 adds community tag" do
    owner = user_fixture()

    sub_map =
      sub_map_fixture(%{"community_url" => "tagged-community"}, owner)

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Tagged Spot",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other",
          "tags" => ["local"]
        }
      )

    pin = Storymap.Repo.preload(pin, :tags)
    tag_names = Enum.map(pin.tags, & &1.name)
    assert "community:tagged-community" in tag_names
    assert "local" in tag_names
  end

  test "approval_required sets pin pending" do
    owner = user_fixture()
    contributor = user_fixture()

    sub_map =
      sub_map_fixture(
        %{"contribution_mode" => "approval_required", "community_url" => "approve-test"},
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

    assert pin.status == :pending
    assert [%{title: "Pending Spot"}] = SubMaps.pending_pins(sub_map)
    refute pin.id in Enum.map(SubMaps.list_pins(sub_map, nil, nil), & &1.id)
  end

  test "approval_required approves pins created by sub-map moderators/owners" do
    owner = user_fixture()

    sub_map =
      sub_map_fixture(
        %{"contribution_mode" => "approval_required", "community_url" => "approve-owner"},
        owner
      )

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Owner Spot",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    assert pin.status == :approved
    assert [] == SubMaps.pending_pins(sub_map)
    assert pin.id in Enum.map(SubMaps.list_pins(sub_map, nil, nil), & &1.id)
  end

  test "approve_pin/3 makes pin visible in community list" do
    owner = user_fixture()
    contributor = user_fixture()

    sub_map =
      sub_map_fixture(
        %{"contribution_mode" => "approval_required", "community_url" => "approve-flow"},
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
    assert approved.status == :approved
    assert approved.id in Enum.map(SubMaps.list_pins(sub_map, nil, nil), & &1.id)
  end

  test "update_pin/3 keeps visible_on_world_map when policy forbids override" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

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

    refute pin.visible_on_world_map
    membership = SubMaps.get_membership(sub_map.id, owner.id)

    {:ok, updated} =
      Pins.update_pin(
        pin,
        %{"visible_on_world_map" => true},
        sub_map: sub_map,
        user: owner,
        membership: membership
      )

    refute updated.visible_on_world_map
  end

  test "update_pin/3 applies visible_on_world_map when ask policy allows" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"promote_to_world_default" => "ask"}, owner)

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Maybe global",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    refute pin.visible_on_world_map
    membership = SubMaps.get_membership(sub_map.id, owner.id)

    {:ok, updated} =
      Pins.update_pin(
        pin,
        %{"visible_on_world_map" => true},
        sub_map: sub_map,
        user: owner,
        membership: membership
      )

    assert updated.visible_on_world_map
  end

  test "world list excludes sub-map-only pins" do
    owner = user_fixture()
    sub_map = sub_map_fixture(%{"promote_to_world_default" => "never"}, owner)

    {:ok, _pin} =
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

    refute Enum.any?(Pins.list_pins(), &(&1.title == "Local only"))
  end

  test "update_sub_map/3 updates settings for owner" do
    user = user_fixture()

    {:ok, sub_map} =
      SubMaps.create_sub_map(%Scope{user: user}, %{
        "name" => "Orig",
        "community_url" => "upd-test"
      })

    {:ok, updated} =
      SubMaps.update_sub_map(%Scope{user: user}, sub_map, %{
        "name" => "Renamed",
        "description" => "New desc"
      })

    assert updated.name == "Renamed"
    assert updated.description == "New desc"
  end

  test "update_sub_map/3 forbidden for non-owner" do
    owner = user_fixture()
    other = user_fixture()

    {:ok, sub_map} =
      SubMaps.create_sub_map(%Scope{user: owner}, %{
        "name" => "Orig",
        "community_url" => "upd-deny"
      })

    assert {:error, :forbidden} =
             SubMaps.update_sub_map(%Scope{user: other}, sub_map, %{"name" => "Hacked"})
  end

  test "create_sub_map/2 forbidden when user is muted" do
    user = muted_user_fixture()

    assert {:error, :forbidden} =
             SubMaps.create_sub_map(%Scope{user: user}, %{
               "name" => "Muted",
               "community_url" => "muted-create"
             })
  end

  test "update_sub_map/3 forbidden when owner is muted" do
    user = user_fixture()

    {:ok, sub_map} =
      SubMaps.create_sub_map(%Scope{user: user}, %{
        "name" => "Orig",
        "community_url" => "muted-upd"
      })

    muted = muted_user_fixture(user)

    assert {:error, :forbidden} =
             SubMaps.update_sub_map(%Scope{user: muted}, sub_map, %{"name" => "Renamed"})
  end

  test "approve_pin/3 forbidden when moderator is muted" do
    owner = user_fixture()
    contributor = user_fixture()

    sub_map =
      sub_map_fixture(
        %{"contribution_mode" => "approval_required", "community_url" => "muted-approve"},
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

    muted_owner = muted_user_fixture(owner)

    assert {:error, :forbidden} =
             SubMaps.approve_pin(%Scope{user: muted_owner}, sub_map, pin.id)
  end
end
