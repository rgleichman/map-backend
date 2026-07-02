defmodule StorymapWeb.PinBroadcastTest do
  use Storymap.DataCase, async: true

  import Storymap.PinsFixtures
  import Storymap.SubMapsFixtures

  alias Storymap.Repo
  alias Storymap.Accounts.Scope
  alias Storymap.AccountsFixtures
  alias Storymap.Pins
  alias Storymap.SubMaps
  alias StorymapWeb.{Endpoint, PinBroadcast}

  test "broadcast_pin_event/2 with integer id broadcasts world delete" do
    pin_id = 42_001
    :ok = Endpoint.subscribe("map:world")

    assert :ok = PinBroadcast.broadcast_pin_event(pin_id, :deleted)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "map:world",
      event: "marker_deleted",
      payload: %{pin_id: ^pin_id}
    }
  end

  test "broadcast_pin_event/2 includes linked_pins on marker_updated" do
    user = AccountsFixtures.user_fixture()
    target = pin_fixture(%{"title" => "Target Pin"}, user)
    source = pin_fixture(%{"title" => "Source Pin"}, user)

    {:ok, source} =
      Pins.update_pin(source, %{
        "title" => source.title,
        "linked_pin_ids" => [target.id]
      })

    :ok = Endpoint.subscribe("map:world")
    assert :ok = PinBroadcast.broadcast_pin_event(source, :updated)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: "map:world",
      event: "marker_updated",
      payload: %{pin: pin_data}
    }

    assert [%{pin_id: target_id, source_field: nil}] = pin_data.linked_pins
    assert target_id == target.id
  end

  test "pending sub-map pin is not broadcast on public channel" do
    owner = AccountsFixtures.user_fixture()
    contributor = AccountsFixtures.user_fixture()

    sub_map =
      sub_map_fixture(
        %{"community_url" => "pending-broadcast", "contribution_mode" => "approval_required"},
        owner
      )

    {:ok, pending_pin} =
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

    public_topic = PinBroadcast.submap_topic(sub_map.community_url)
    mod_topic = PinBroadcast.mod_submap_topic(sub_map.community_url)

    :ok = Endpoint.subscribe(public_topic)
    :ok = Endpoint.subscribe(mod_topic)

    assert :ok = PinBroadcast.broadcast_pin_event(pending_pin, :created)

    refute_receive %Phoenix.Socket.Broadcast{topic: ^public_topic}, 50

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^mod_topic,
      event: "marker_added",
      payload: %{pin: %{id: pin_id, status: "pending"}}
    }

    assert pin_id == pending_pin.id
  end

  test "approved sub-map pin is broadcast on public and mod channels" do
    owner = AccountsFixtures.user_fixture()

    sub_map =
      sub_map_fixture(
        %{"community_url" => "approved-broadcast", "contribution_mode" => "open"},
        owner
      )

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Approved Spot",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    public_topic = PinBroadcast.submap_topic(sub_map.community_url)
    mod_topic = PinBroadcast.mod_submap_topic(sub_map.community_url)

    :ok = Endpoint.subscribe(public_topic)
    :ok = Endpoint.subscribe(mod_topic)

    assert :ok = PinBroadcast.broadcast_pin_event(pin, :created)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^public_topic,
      event: "marker_added",
      payload: %{pin: %{id: public_pin_id}}
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^mod_topic,
      event: "marker_added",
      payload: %{pin: %{id: mod_pin_id}}
    }

    assert public_pin_id == pin.id
    assert mod_pin_id == pin.id
  end

  test "rejected sub-map pin sends marker_deleted on mod channel only" do
    owner = AccountsFixtures.user_fixture()
    contributor = AccountsFixtures.user_fixture()

    sub_map =
      sub_map_fixture(
        %{"community_url" => "reject-broadcast", "contribution_mode" => "approval_required"},
        owner
      )

    {:ok, pending_pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: contributor},
        sub_map,
        %{
          "title" => "To Reject",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    {:ok, rejected_pin} =
      SubMaps.reject_pin(%Scope{user: owner}, sub_map, pending_pin.id)

    public_topic = PinBroadcast.submap_topic(sub_map.community_url)
    mod_topic = PinBroadcast.mod_submap_topic(sub_map.community_url)

    :ok = Endpoint.subscribe(public_topic)
    :ok = Endpoint.subscribe(mod_topic)

    assert :ok = PinBroadcast.broadcast_pin_event(rejected_pin, :updated)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^public_topic,
      event: "marker_deleted",
      payload: %{pin_id: public_pin_id}
    }

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^mod_topic,
      event: "marker_deleted",
      payload: %{pin_id: pin_id}
    }

    assert public_pin_id == rejected_pin.id
    assert pin_id == rejected_pin.id
  end

  test "approved -> pending sends marker_deleted on public channel" do
    owner = AccountsFixtures.user_fixture()

    sub_map =
      sub_map_fixture(
        %{"community_url" => "demote-broadcast", "contribution_mode" => "open"},
        owner
      )

    {:ok, pin} =
      SubMaps.create_pin_in_sub_map(
        %Scope{user: owner},
        sub_map,
        %{
          "title" => "Demote Me",
          "latitude" => 30.0,
          "longitude" => -97.0,
          "pin_type" => "other"
        }
      )

    demoted_pin =
      pin
      |> Ecto.Changeset.change(%{status: :pending})
      |> Repo.update!()
      |> Repo.preload([:tags, :sub_map, :outgoing_references])

    public_topic = PinBroadcast.submap_topic(sub_map.community_url)
    :ok = Endpoint.subscribe(public_topic)

    assert :ok = PinBroadcast.broadcast_pin_event(demoted_pin, :updated)

    assert_receive %Phoenix.Socket.Broadcast{
      topic: ^public_topic,
      event: "marker_deleted",
      payload: %{pin_id: pin_id}
    }

    assert pin_id == demoted_pin.id
  end
end
