defmodule StorymapWeb.PinCommentController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.{AuthorizerOpts, CommentAuthorizer, Comments, Pin}
  alias StorymapWeb.CommentBroadcast
  alias StorymapWeb.ConnAuth

  action_fallback StorymapWeb.FallbackController

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, %{"pin_id" => pin_id} = params) do
    user = ConnAuth.current_user(conn)

    with {id, ""} <- Integer.parse(pin_id),
         %Pin{} = pin <- Pins.get_pin(id) do
      opts = authorizer_opts(conn, pin)

      with :ok <- CommentAuthorizer.authorize_list(user, pin, opts) do
        comments = Comments.list_for_pin(pin.id, list_opts(params))

        conn
        |> put_view(json: StorymapWeb.PinCommentJSON)
        |> render(:index, comments: comments, current_user: user)
      else
        {:error, :not_found} = err -> err
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"pin_id" => pin_id, "comment" => comment_params}) do
    with {id, ""} <- Integer.parse(pin_id),
         %Pin{} = pin <- Pins.get_pin(id) do
      user = conn.assigns.current_scope.user
      opts = authorizer_opts(conn, pin)

      with :ok <- CommentAuthorizer.authorize_create(user, pin, opts),
           {:ok, comment} <- Comments.create_comment(pin, user, comment_params) do
        CommentBroadcast.broadcast_comment_event(pin, comment, :created)

        conn
        |> put_status(:created)
        |> put_view(json: StorymapWeb.PinCommentJSON)
        |> render(:show, comment: comment, current_user: user)
      else
        {:error, %Ecto.Changeset{} = changeset} -> {:error, changeset}
        {:error, :forbidden} = err -> err
        {:error, :not_found} = err -> err
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"pin_id" => pin_id, "id" => id, "comment" => comment_params}) do
    with {pin_int, ""} <- Integer.parse(pin_id),
         %Pin{} = pin <- Pins.get_pin(pin_int) do
      comment = Comments.get_comment!(id)
      user = conn.assigns.current_scope.user
      opts = authorizer_opts(conn, pin)

      with true <- comment.pin_id == pin.id,
           :ok <- CommentAuthorizer.authorize_update(user, comment, opts),
           {:ok, comment} <- Comments.update_comment(comment, comment_params) do
        CommentBroadcast.broadcast_comment_event(pin, comment, :updated)

        conn
        |> put_view(json: StorymapWeb.PinCommentJSON)
        |> render(:show, comment: comment, current_user: user)
      else
        false -> {:error, :not_found}
        {:error, :forbidden} = err -> err
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"pin_id" => pin_id, "id" => id}) do
    with {pin_int, ""} <- Integer.parse(pin_id),
         %Pin{} = pin <- Pins.get_pin(pin_int) do
      comment = Comments.get_comment!(id)
      user = conn.assigns.current_scope.user
      opts = authorizer_opts(conn, pin)

      with true <- comment.pin_id == pin.id,
           :ok <- CommentAuthorizer.authorize_delete(user, pin, comment, opts),
           {:ok, comment} <- Comments.delete_comment(comment) do
        CommentBroadcast.broadcast_comment_event(pin, comment, :deleted)

        conn
        |> put_view(json: StorymapWeb.PinCommentJSON)
        |> render(:show, comment: comment, current_user: user)
      else
        false -> {:error, :not_found}
        {:error, :forbidden} = err -> err
      end
    else
      _ -> {:error, :not_found}
    end
  end

  defp authorizer_opts(conn, %Pin{} = pin) do
    AuthorizerOpts.for_pin(ConnAuth.current_user(conn), pin)
  end

  defp list_opts(params) do
    [
      limit: parse_limit(Map.get(params, "limit")),
      after_id: parse_after_id(Map.get(params, "after_id"))
    ]
    |> Enum.reject(fn {_k, v} -> is_nil(v) end)
  end

  defp parse_limit(nil), do: nil

  defp parse_limit(value) when is_binary(value) do
    case Integer.parse(value) do
      {n, ""} when n > 0 -> n
      _ -> nil
    end
  end

  defp parse_limit(_), do: nil

  defp parse_after_id(nil), do: nil

  defp parse_after_id(value) when is_binary(value) do
    case Integer.parse(value) do
      {n, ""} when n > 0 -> n
      _ -> nil
    end
  end

  defp parse_after_id(_), do: nil
end
