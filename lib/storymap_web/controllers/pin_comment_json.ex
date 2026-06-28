defmodule StorymapWeb.PinCommentJSON do
  @moduledoc """
  JSON rendering for pin comments.
  """
  alias Storymap.Accounts.User
  alias Storymap.Pins.PinComment

  @spec index(map()) :: map()
  def index(%{comments: comments} = assigns) do
    current_user = Map.get(assigns, :current_user)
    %{data: Enum.map(comments, &comment_data(&1, current_user))}
  end

  @spec show(map()) :: map()
  def show(%{comment: comment} = assigns) do
    current_user = Map.get(assigns, :current_user)
    %{data: comment_data(comment, current_user)}
  end

  @spec comment_data(PinComment.t(), User.t() | nil) :: map()
  def comment_data(%PinComment{} = comment, current_user) do
    base = %{
      id: comment.id,
      pin_id: comment.pin_id,
      parent_id: comment.parent_id,
      body: comment_body(comment),
      deleted: PinComment.deleted?(comment),
      author: author_data(comment),
      is_author: author?(comment, current_user),
      inserted_at: datetime_to_iso_local(comment.inserted_at),
      updated_at: datetime_to_iso_local(comment.updated_at)
    }

    if is_nil(comment.parent_id) do
      Map.put(base, :replies, Enum.map(comment.replies || [], &reply_data(&1, current_user)))
    else
      base
    end
  end

  defp reply_data(%PinComment{} = comment, current_user) do
    %{
      id: comment.id,
      pin_id: comment.pin_id,
      parent_id: comment.parent_id,
      body: comment_body(comment),
      deleted: PinComment.deleted?(comment),
      author: author_data(comment),
      is_author: author?(comment, current_user),
      inserted_at: datetime_to_iso_local(comment.inserted_at),
      updated_at: datetime_to_iso_local(comment.updated_at)
    }
  end

  defp comment_body(%PinComment{deleted_at: %DateTime{}}), do: ""
  defp comment_body(%PinComment{body: body}), do: body || ""

  defp author_data(%PinComment{user_id: user_id}) when is_integer(user_id), do: %{id: user_id}
  defp author_data(_), do: nil

  defp author?(%PinComment{user_id: user_id}, %User{id: user_id}), do: true
  defp author?(_, _), do: false

  defp datetime_to_iso_local(%DateTime{} = dt) do
    pad = fn n -> String.pad_leading(Integer.to_string(n), 2, "0") end

    "#{dt.year}-#{pad.(dt.month)}-#{pad.(dt.day)}T#{pad.(dt.hour)}:#{pad.(dt.minute)}:#{pad.(dt.second)}"
  end

  defp datetime_to_iso_local(_), do: nil
end
