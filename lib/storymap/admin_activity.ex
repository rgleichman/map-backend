defmodule Storymap.AdminActivity do
  @moduledoc """
  Persistent admin activity feed and per-admin read state.
  """

  import Ecto.Query, warn: false

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.AdminActivity.Event
  alias Storymap.AdminActivity.Read
  alias Storymap.Notifications
  alias Storymap.Repo

  @pubsub_topic "admin_activity:events"

  def pubsub_topic, do: @pubsub_topic

  def record_event(type, actor_user_id, metadata \\ %{})
      when is_binary(type) and (is_integer(actor_user_id) or is_nil(actor_user_id)) and
             is_map(metadata) do
    %Event{}
    |> Event.changeset(%{type: type, actor_user_id: actor_user_id, metadata: metadata})
    |> Repo.insert()
    |> case do
      {:ok, %Event{} = event} ->
        Phoenix.PubSub.broadcast(Storymap.PubSub, @pubsub_topic, {:admin_activity_event, event})
        Notifications.admin_activity_new_event(event.id)
        {:ok, event}

      {:error, _} = err ->
        err
    end
  end

  def list_events_for_admin(scope, opts \\ [])

  def list_events_for_admin(%Scope{user: %User{admin_level: admin_level}}, opts)
      when admin_level >= 10 do
    limit = Keyword.get(opts, :limit, 50)

    after_id = Keyword.get(opts, :after_id)
    after_inserted_at = Keyword.get(opts, :after_inserted_at)

    base =
      from(e in Event,
        order_by: [desc: e.inserted_at, desc: e.id],
        limit: ^limit
      )

    base =
      if is_integer(after_id) and match?(%DateTime{}, after_inserted_at) do
        from(e in base,
          where:
            e.inserted_at < ^after_inserted_at or
              (e.inserted_at == ^after_inserted_at and e.id < ^after_id)
        )
      else
        base
      end

    Repo.all(base)
  end

  def list_events_for_admin(_scope, _opts), do: []

  def unread_count(%Scope{user: %User{} = user} = scope), do: unread_count(scope, user.id)

  def unread_count(%Scope{user: %User{admin_level: admin_level}}, admin_user_id)
      when admin_level >= 10 and is_integer(admin_user_id) do
    reads_subquery =
      from(r in Read,
        where: r.admin_user_id == ^admin_user_id,
        select: r.admin_activity_event_id
      )

    from(e in Event, where: e.id not in subquery(reads_subquery), select: count(e.id))
    |> Repo.one()
  end

  def unread_count(_scope, _admin_user_id), do: 0

  def read_event_ids_for_admin(
        %Scope{user: %User{admin_level: admin_level, id: admin_user_id}},
        event_ids
      )
      when admin_level >= 10 and is_integer(admin_user_id) and is_list(event_ids) do
    event_ids = Enum.filter(event_ids, &is_integer/1)

    if event_ids == [] do
      []
    else
      from(r in Read,
        where: r.admin_user_id == ^admin_user_id and r.admin_activity_event_id in ^event_ids,
        select: r.admin_activity_event_id
      )
      |> Repo.all()
    end
  end

  def read_event_ids_for_admin(_scope, _event_ids), do: []

  def get_event!(%Scope{user: %User{admin_level: admin_level}}, event_id)
      when admin_level >= 10 and is_integer(event_id) do
    Repo.get!(Event, event_id)
  end

  def mark_read(%Scope{user: %User{admin_level: admin_level, id: admin_user_id}}, event_id)
      when admin_level >= 10 and is_integer(admin_user_id) and is_integer(event_id) do
    now = utc_now_second()

    %Read{}
    |> Read.changeset(%{
      admin_user_id: admin_user_id,
      admin_activity_event_id: event_id,
      read_at: now
    })
    |> Repo.insert(on_conflict: :nothing)
    |> case do
      {:ok, %Read{}} = ok -> ok
      {:error, _} = err -> err
    end
  end

  def mark_read(_scope, _event_id), do: {:error, :unauthorized}

  def mark_unread(%Scope{user: %User{admin_level: admin_level, id: admin_user_id}}, event_id)
      when admin_level >= 10 and is_integer(admin_user_id) and is_integer(event_id) do
    {deleted, _} =
      from(r in Read,
        where: r.admin_user_id == ^admin_user_id and r.admin_activity_event_id == ^event_id
      )
      |> Repo.delete_all()

    if deleted > 0, do: {:ok, :cleared}, else: {:ok, :noop}
  end

  def mark_unread(_scope, _event_id), do: {:error, :unauthorized}

  def mark_all_read(%Scope{user: %User{admin_level: admin_level, id: admin_user_id}})
      when admin_level >= 10 do
    now = utc_now_second()

    unread_event_ids = unread_event_ids(admin_user_id)

    rows =
      Enum.map(unread_event_ids, fn event_id ->
        %{
          admin_user_id: admin_user_id,
          admin_activity_event_id: event_id,
          read_at: now,
          inserted_at: now,
          updated_at: now
        }
      end)

    _ =
      if rows == [] do
        {0, nil}
      else
        Repo.insert_all(Read, rows, on_conflict: :nothing)
      end

    :ok
  end

  def mark_all_read(_scope), do: {:error, :unauthorized}

  defp unread_event_ids(admin_user_id) do
    reads_subquery =
      from(r in Read,
        where: r.admin_user_id == ^admin_user_id,
        select: r.admin_activity_event_id
      )

    from(e in Event,
      where: e.id not in subquery(reads_subquery),
      select: e.id
    )
    |> Repo.all()
  end

  defp utc_now_second do
    DateTime.utc_now()
    |> DateTime.truncate(:second)
  end
end
