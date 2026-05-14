defmodule Storymap.Notifications do
  @moduledoc """
  Realtime pushes to Phoenix Channels from domain code.

  Wraps `Phoenix.PubSub` with the same message shape as `Phoenix.Endpoint.broadcast/3`
  so channel clients behave identically without contexts depending on `StorymapWeb`.
  """

  @pubsub Storymap.PubSub

  @doc """
  Broadcasts to a Phoenix Channel topic (same semantics as `Endpoint.broadcast/3`).
  """
  def broadcast_channel(topic, event, payload)
      when is_binary(topic) and is_binary(event) and is_map(payload) do
    Phoenix.PubSub.broadcast(@pubsub, topic, %Phoenix.Socket.Broadcast{
      topic: topic,
      event: event,
      payload: payload
    })
  end

  def admin_reports_counts_changed do
    broadcast_channel("admin:reports", "counts_changed", %{})
  end

  def admin_activity_new_event(event_id) when is_integer(event_id) do
    broadcast_channel("admin:activity", "new_event", %{event_id: event_id})
  end
end
