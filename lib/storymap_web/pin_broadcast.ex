defmodule StorymapWeb.PinBroadcast do
  @moduledoc """
  Broadcasts pin events to world and sub-map Phoenix channels.
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.Query
  alias Storymap.Pins.Visibility
  alias Storymap.Repo
  alias StorymapWeb.Endpoint
  alias StorymapWeb.PinJSON

  @type pin_event :: :created | :updated | :deleted

  @spec broadcast_pin_event(Pin.t(), pin_event()) :: :ok
  def broadcast_pin_event(%Pin{} = pin, event) when event in [:created, :updated, :deleted] do
    pin = Repo.preload(pin, Query.list_preloads(), force: true)

    if pin.sub_map_id && pin.sub_map do
      topic = submap_topic(pin.sub_map.community_url)
      payload = event_payload(pin, event)
      Endpoint.broadcast(topic, event_name(event), payload)
    end

    if Visibility.world_visible?(pin) do
      payload = event_payload(pin, event)
      Endpoint.broadcast("map:world", event_name(event), payload)
    end

    :ok
  end

  @spec broadcast_pin_event(integer(), :deleted) :: :ok
  def broadcast_pin_event(pin_id, :deleted) when is_integer(pin_id) do
    Endpoint.broadcast("map:world", "marker_deleted", %{pin_id: pin_id})
    :ok
  end

  @spec submap_topic(String.t()) :: String.t()
  defp submap_topic(community_url), do: "map:submap:#{community_url}"

  @spec event_name(pin_event()) :: String.t()
  defp event_name(:created), do: "marker_added"
  defp event_name(:updated), do: "marker_updated"
  defp event_name(:deleted), do: "marker_deleted"

  @spec event_payload(Pin.t(), pin_event()) :: map()
  defp event_payload(%Pin{} = pin, :deleted), do: %{pin_id: pin.id}

  defp event_payload(%Pin{} = pin, event) when event in [:created, :updated] do
    %{pin: PinJSON.data(pin)}
  end
end
