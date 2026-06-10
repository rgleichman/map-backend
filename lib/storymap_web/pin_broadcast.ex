defmodule StorymapWeb.PinBroadcast do
  @moduledoc """
  Broadcasts pin events to world and sub-map Phoenix channels.
  """
  alias Storymap.Pins.Pin
  alias Storymap.Repo
  alias StorymapWeb.Endpoint
  alias StorymapWeb.PinJSON

  @approved "approved"

  def broadcast_pin_event(%Pin{} = pin, event) when event in [:created, :updated, :deleted] do
    pin = Repo.preload(pin, [:tags, :sub_map])

    if pin.sub_map_id && pin.sub_map do
      topic = submap_topic(pin.sub_map.community_url)
      payload = event_payload(pin, event)
      Endpoint.broadcast(topic, event_name(event), payload)
    end

    if broadcast_to_world?(pin) do
      payload = event_payload(pin, event)
      Endpoint.broadcast("map:world", event_name(event), payload)
    end

    :ok
  end

  def broadcast_pin_event(pin_id, :deleted) when is_integer(pin_id) do
    Endpoint.broadcast("map:world", "marker_deleted", %{pin_id: pin_id})
    :ok
  end

  defp broadcast_to_world?(%Pin{sub_map_id: nil, status: @approved}), do: true

  defp broadcast_to_world?(%Pin{status: @approved, visible_on_world_map: true}), do: true
  defp broadcast_to_world?(_), do: false

  defp submap_topic(community_url), do: "map:submap:#{community_url}"

  defp event_name(:created), do: "marker_added"
  defp event_name(:updated), do: "marker_updated"
  defp event_name(:deleted), do: "marker_deleted"

  defp event_payload(%Pin{} = pin, :deleted), do: %{pin_id: pin.id}

  defp event_payload(%Pin{} = pin, event) when event in [:created, :updated] do
    %{pin: PinJSON.data(pin)}
  end
end
