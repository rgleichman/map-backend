defmodule StorymapWeb.CommentBroadcast do
  @moduledoc """
  Broadcasts pin comment events to world and sub-map Phoenix channels.
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.PinComment
  alias StorymapWeb.MapChannelBroadcast
  alias StorymapWeb.PinCommentJSON

  @type comment_event :: :created | :updated | :deleted

  @spec broadcast_comment_event(Pin.t(), PinComment.t(), comment_event()) :: :ok
  def broadcast_comment_event(%Pin{} = pin, %PinComment{} = comment, event)
      when event in [:created, :updated, :deleted] do
    MapChannelBroadcast.broadcast_for_pin(
      pin,
      event_name(event),
      event_payload(pin, comment, event)
    )
  end

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
