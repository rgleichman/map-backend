defmodule StorymapWeb.PinBroadcastTest do
  use Storymap.DataCase, async: true

  import Storymap.PinsFixtures

  alias Storymap.AccountsFixtures
  alias Storymap.Pins
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
end
