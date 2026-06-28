defmodule Storymap.Pins.Comments do
  @moduledoc """
  CRUD for threaded pin comments (one level of replies).
  """
  import Ecto.Query

  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin
  alias Storymap.Pins.PinComment
  alias Storymap.Repo
  alias Storymap.Types

  @default_limit 20
  @max_limit 50

  @spec list_for_pin(integer(), keyword()) :: [PinComment.t()]
  def list_for_pin(pin_id, opts \\ []) when is_integer(pin_id) do
    limit = opts |> Keyword.get(:limit, @default_limit) |> min(@max_limit)
    after_id = Keyword.get(opts, :after_id)

    query =
      from(c in PinComment,
        where: c.pin_id == ^pin_id and is_nil(c.parent_id),
        order_by: [asc: c.inserted_at, asc: c.id],
        limit: ^limit,
        preload: [:user, replies: ^replies_query()]
      )

    query =
      if after_id do
        from(c in query, where: c.id > ^after_id)
      else
        query
      end

    Repo.all(query)
  end

  @spec get_comment!(integer()) :: PinComment.t()
  def get_comment!(id), do: Repo.get!(PinComment, id) |> Repo.preload([:user, :replies])

  @spec get_comment(integer()) :: PinComment.t() | nil
  def get_comment(id) when is_integer(id) do
    case Repo.get(PinComment, id) do
      nil -> nil
      comment -> Repo.preload(comment, [:user, :replies])
    end
  end

  @spec create_comment(Pin.t(), User.t(), map()) :: Types.ecto_result(PinComment.t())
  def create_comment(%Pin{status: :approved} = pin, %User{} = user, attrs) do
    attrs = stringify_keys(attrs)
    parent = fetch_parent(attrs, pin.id)

    %PinComment{}
    |> PinComment.create_changeset(attrs, pin_id: pin.id, user_id: user.id, parent: parent)
    |> Repo.insert()
    |> case do
      {:ok, comment} -> {:ok, preload_comment(comment)}
      {:error, _} = err -> err
    end
  end

  def create_comment(%Pin{}, %User{}, _attrs) do
    {:error, pin_not_approved_error()}
  end

  @spec update_comment(PinComment.t(), map()) :: Types.ecto_result(PinComment.t())
  def update_comment(%PinComment{} = comment, attrs) do
    attrs = stringify_keys(attrs)

    comment
    |> PinComment.update_changeset(attrs)
    |> Repo.update()
    |> case do
      {:ok, comment} -> {:ok, preload_comment(comment)}
      {:error, _} = err -> err
    end
  end

  @spec delete_comment(PinComment.t()) :: Types.ecto_result(PinComment.t())
  def delete_comment(%PinComment{} = comment) do
    comment
    |> PinComment.delete_changeset()
    |> Repo.update()
    |> case do
      {:ok, comment} -> {:ok, preload_comment(comment)}
      {:error, _} = err -> err
    end
  end

  defp replies_query do
    from(r in PinComment,
      order_by: [asc: r.inserted_at, asc: r.id],
      preload: [:user]
    )
  end

  defp preload_comment(%PinComment{} = comment) do
    Repo.preload(comment, [:user, :replies])
  end

  defp fetch_parent(%{"parent_id" => parent_id}, pin_id) when is_integer(parent_id) do
    case Repo.get(PinComment, parent_id) do
      %PinComment{pin_id: ^pin_id} = parent -> parent
      _ -> nil
    end
  end

  defp fetch_parent(%{"parent_id" => parent_id}, pin_id) when is_binary(parent_id) do
    case Integer.parse(parent_id) do
      {id, ""} -> fetch_parent(%{"parent_id" => id}, pin_id)
      _ -> nil
    end
  end

  defp fetch_parent(_attrs, _pin_id), do: nil

  defp stringify_keys(attrs) when is_map(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp pin_not_approved_error do
    %PinComment{}
    |> Ecto.Changeset.change()
    |> Ecto.Changeset.add_error(:pin_id, "comments are only allowed on approved pins")
  end
end
