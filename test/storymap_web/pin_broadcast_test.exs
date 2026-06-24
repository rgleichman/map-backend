defmodule StorymapWeb.PinBroadcastTest do
  use ExUnit.Case, async: true

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
end
