defmodule StorymapWeb.PinCommentJSON do
  @moduledoc """
  JSON rendering for pin comments.
  """
  alias Storymap.Accounts.User
  alias Storymap.Pins.PinComment
  alias StorymapWeb.JSON.DateTime, as: JSONDateTime

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
    base = comment_fields(comment, current_user)

    if is_nil(comment.parent_id) do
      Map.put(base, :replies, Enum.map(comment.replies || [], &comment_fields(&1, current_user)))
    else
      base
    end
  end

  defp comment_fields(%PinComment{} = comment, current_user) do
    %{
      id: comment.id,
      pin_id: comment.pin_id,
      parent_id: comment.parent_id,
      body: comment_body(comment),
      deleted: PinComment.deleted?(comment),
      author: author_data(comment, current_user),
      is_author: author?(comment, current_user),
      inserted_at: JSONDateTime.to_iso_local(comment.inserted_at),
      updated_at: JSONDateTime.to_iso_local(comment.updated_at)
    }
  end

  defp comment_body(%PinComment{deleted_at: %DateTime{}}), do: ""
  defp comment_body(%PinComment{body: body}), do: body || ""

  # Privacy: only include numeric user_id for the current user's own comments.
  defp author_data(%PinComment{user_id: user_id} = comment, current_user)
       when is_integer(user_id) do
    if author?(comment, current_user), do: %{id: user_id}, else: nil
  end

  defp author_data(_, _), do: nil

  defp author?(%PinComment{user_id: user_id}, %{id: user_id}), do: true
  defp author?(_, _), do: false
end
