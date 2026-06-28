defmodule StorymapWeb.CommentBroadcast do
  @moduledoc """
  Broadcasts pin comment events to world and sub-map Phoenix channels.
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.PinComment
  alias Storymap.Pins.Visibility
  alias StorymapWeb.Endpoint
  alias StorymapWeb.PinCommentJSON

  @type comment_event :: :created | :updated | :deleted

  @spec broadcast_comment_event(Pin.t(), PinComment.t(), comment_event()) :: :ok
  def broadcast_comment_event(%Pin{} = pin, %PinComment{} = comment, event)
      when event in [:created, :updated, :deleted] do
    if pin.sub_map_id && pin.sub_map do
      topic = submap_topic(pin.sub_map.community_url)
      Endpoint.broadcast(topic, event_name(event), event_payload(pin, comment, event))
    end

    if Visibility.world_visible?(pin) do
      Endpoint.broadcast("map:world", event_name(event), event_payload(pin, comment, event))
    end

    :ok
  end

  @spec submap_topic(String.t()) :: String.t()
  defp submap_topic(community_url), do: "map:submap:#{community_url}"

  @spec event_name(comment_event()) :: String.t()
  defp event_name(:created), do: "comment_added"
  defp event_name(:updated), do: "comment_updated"
  defp event_name(:deleted), do: "comment_deleted"

  @spec event_payload(Pin.t(), PinComment.t(), comment_event()) :: map()
  defp event_payload(%Pin{id: pin_id}, %PinComment{} = comment, :deleted) do
    %{
      pin_id: pin_id,
      comment_id: comment.id,
      parent_id: comment.parent_id
    }
  end

  defp event_payload(%Pin{id: pin_id}, %PinComment{} = comment, event)
       when event in [:created, :updated] do
    %{
      pin_id: pin_id,
      comment: PinCommentJSON.comment_data(comment, nil)
    }
  end
end
