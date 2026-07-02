defmodule StorymapWeb.PinBroadcast do
  @moduledoc """
  Broadcasts pin events to world and sub-map Phoenix channels.

  Sub-map public channels receive only approved pins (same as HTTP list queries).
  Moderators subscribe to `map:submap:<url>:mod` for pending pins as well.
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
      broadcast_sub_map_pin_event(pin, event)
    end

    if Visibility.world_visible?(pin) do
      payload = event_payload(pin, event)
      Endpoint.broadcast("map:world", event_name(event), payload)
    end

    :ok
  end

  @spec broadcast_pin_event(integer(), :deleted) :: :ok
  def broadcast_pin_event(pin_id, :deleted) when is_integer(pin_id) do
    Endpoint.broadcast("map:world", event_name(:deleted), %{pin_id: pin_id})
    :ok
  end

  @spec broadcast_sub_map_pin_event(Pin.t(), pin_event()) :: :ok
  defp broadcast_sub_map_pin_event(%Pin{} = pin, event) do
    community_url = pin.sub_map.community_url
    public_topic = submap_topic(community_url)
    mod_topic = mod_submap_topic(community_url)

    case event do
      :deleted ->
        # We don't know what clients currently have cached, so always tell both
        # topics to remove this pin.
        Endpoint.broadcast(public_topic, event_name(:deleted), %{pin_id: pin.id})
        Endpoint.broadcast(mod_topic, event_name(:deleted), %{pin_id: pin.id})

      :created ->
        if Query.sub_map_public_broadcast_visible?(pin) do
          Endpoint.broadcast(public_topic, event_name(event), event_payload(pin, event))
        end

        if Query.sub_map_mod_broadcast_visible?(pin) do
          Endpoint.broadcast(mod_topic, event_name(event), event_payload(pin, event))
        end

      :updated ->
        if Query.sub_map_public_broadcast_visible?(pin) do
          Endpoint.broadcast(public_topic, event_name(event), event_payload(pin, event))
        else
          # Pin was previously visible to the public topic, but may no longer be
          # (e.g. approved -> pending). Tell subscribers to remove it.
          Endpoint.broadcast(public_topic, event_name(:deleted), %{pin_id: pin.id})
        end

        if Query.sub_map_mod_broadcast_visible?(pin) do
          Endpoint.broadcast(mod_topic, event_name(event), event_payload(pin, event))
        else
          Endpoint.broadcast(mod_topic, event_name(:deleted), %{pin_id: pin.id})
        end
    end

    :ok
  end

  @spec submap_topic(String.t()) :: String.t()
  def submap_topic(community_url), do: "map:submap:#{community_url}"

  @spec mod_submap_topic(String.t()) :: String.t()
  def mod_submap_topic(community_url), do: "map:submap:#{community_url}:mod"

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
