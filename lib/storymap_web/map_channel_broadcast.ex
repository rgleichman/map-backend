defmodule StorymapWeb.MapChannelBroadcast do
  @moduledoc """
  Broadcasts a payload to the world map channel and, when applicable, the pin's
  public sub-map channel. Specialized fan-out (e.g. sub-map moderator topics)
  stays in `PinBroadcast`.
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.Visibility
  alias StorymapWeb.Endpoint
  alias StorymapWeb.PinBroadcast

  @spec broadcast_for_pin(Pin.t(), String.t(), map()) :: :ok
  def broadcast_for_pin(%Pin{} = pin, event, payload)
      when is_binary(event) and is_map(payload) do
    if pin.sub_map_id && pin.sub_map do
      topic = PinBroadcast.submap_topic(pin.sub_map.community_url)
      Endpoint.broadcast(topic, event, payload)
    end

    if Visibility.world_visible?(pin) do
      Endpoint.broadcast("map:world", event, payload)
    end

    :ok
  end
end
