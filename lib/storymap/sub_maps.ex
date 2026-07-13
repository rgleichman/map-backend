defmodule Storymap.SubMaps do
  @moduledoc """
  Sub-maps (communities): CRUD, memberships, and moderation.
  """
  import Ecto.Query
  alias Storymap.Accounts.Policy, as: AccountsPolicy
  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.Pins
  alias Storymap.Pins.{Authorizer, Pin, Query, Visibility}
  alias Storymap.Repo
  alias Storymap.SubMaps.{CommunityTag, Membership, PinTypeSettings, Policy, SubMap}
  alias Storymap.Types

  @type counts_map :: %{
          pin_count: non_neg_integer(),
          member_count: non_neg_integer(),
          pending_count: non_neg_integer()
        }

  @type leave_error :: {:error, :owner_cannot_leave} | {:error, :not_member}

  @type moderation_error :: Types.forbidden() | {:error, :not_found} | Types.ecto_err()

  @spec get_by_community_url(String.t()) :: SubMap.t() | nil
  def get_by_community_url(url) when is_binary(url) do
    Repo.get_by(SubMap, community_url: url)
  end

  @spec get_by_community_url!(String.t()) :: SubMap.t()
  def get_by_community_url!(url), do: Repo.get_by!(SubMap, community_url: url)

  @spec get!(integer()) :: SubMap.t()
  def get!(id) when is_integer(id), do: Repo.get!(SubMap, id)

  @doc """
  Resolves sub-map for a pin from explicit opts, preloaded association, or DB lookup.

  Never reads `pin.sub_map` unless `Ecto.assoc_loaded?/1` is true.
  """
  @spec resolve_for_pin(SubMap.t() | nil, Pin.t()) :: SubMap.t() | nil
  def resolve_for_pin(nil, %Pin{sub_map_id: nil}), do: nil
  def resolve_for_pin(%SubMap{} = sub_map, _pin), do: sub_map

  def resolve_for_pin(_, %Pin{sub_map_id: nil}), do: nil

  def resolve_for_pin(_, %Pin{} = pin) do
    cond do
      Ecto.assoc_loaded?(pin.sub_map) -> pin.sub_map
      pin.sub_map_id -> Repo.get(SubMap, pin.sub_map_id)
      true -> nil
    end
  end

  @spec get_membership(integer(), integer()) :: Membership.t() | nil
  def get_membership(sub_map_id, user_id) do
    Repo.get_by(Membership, sub_map_id: sub_map_id, user_id: user_id)
  end

  @spec list_public(keyword()) :: [SubMap.t()]
  def list_public(opts \\ []) do
    q = Keyword.get(opts, :q, "") |> to_string() |> String.trim()
    sort = Keyword.get(opts, :sort, "newest")

    query =
      from(s in SubMap,
        where: s.visibility == ^:public,
        preload: [:owner]
      )

    query =
      if q != "" do
        pattern = "%#{q}%"

        from(s in query,
          where: ilike(s.name, ^pattern) or ilike(s.community_url, ^pattern)
        )
      else
        query
      end

    query = from(s in query, order_by: [desc: s.inserted_at])

    sub_maps = Repo.all(query)
    counts_by_id = batch_counts(Enum.map(sub_maps, & &1.id))

    sub_maps =
      Enum.map(sub_maps, fn sub_map ->
        c = Map.get(counts_by_id, sub_map.id, %{pin_count: 0, member_count: 0})
        struct(sub_map, pin_count: c.pin_count, member_count: c.member_count)
      end)

    case sort do
      "most_pins" -> Enum.sort_by(sub_maps, & &1.pin_count, :desc)
      _ -> sub_maps
    end
  end

  @spec counts(SubMap.t()) :: counts_map()
  def counts(%SubMap{id: id}) do
    pin_count =
      Repo.aggregate(
        from(p in Pin, where: p.sub_map_id == ^id and p.status == ^:approved),
        :count
      )

    member_count =
      Repo.aggregate(
        from(m in Membership, where: m.sub_map_id == ^id and m.status == ^:active),
        :count
      )

    pending_count =
      Repo.aggregate(
        from(p in Pin, where: p.sub_map_id == ^id and p.status == ^:pending),
        :count
      )

    %{pin_count: pin_count, member_count: member_count, pending_count: pending_count}
  end

  defp batch_counts([]), do: %{}

  defp batch_counts(sub_map_ids) do
    pin_counts =
      from(p in Pin,
        where: p.sub_map_id in ^sub_map_ids and p.status == ^:approved,
        group_by: p.sub_map_id,
        select: {p.sub_map_id, count(p.id)}
      )
      |> Repo.all()
      |> Map.new()

    member_counts =
      from(m in Membership,
        where: m.sub_map_id in ^sub_map_ids and m.status == ^:active,
        group_by: m.sub_map_id,
        select: {m.sub_map_id, count(m.id)}
      )
      |> Repo.all()
      |> Map.new()

    Map.new(sub_map_ids, fn id ->
      {id,
       %{
         pin_count: Map.get(pin_counts, id, 0),
         member_count: Map.get(member_counts, id, 0)
       }}
    end)
  end

  @spec create_sub_map(Scope.t(), map()) ::
          Types.ecto_result(SubMap.t()) | Types.authorize_result()
  def create_sub_map(%Scope{user: %User{} = user}, attrs) do
    with :ok <- Storymap.Accounts.Policy.authorize_write?(user) do
      attrs = stringify_keys(attrs)

      Repo.transaction(fn ->
        with {:ok, sub_map} <-
               %SubMap{}
               |> SubMap.changeset(attrs)
               |> Ecto.Changeset.put_change(:owner_user_id, user.id)
               |> Repo.insert(),
             {:ok, _membership} <-
               insert_membership(sub_map.id, user.id, "owner", "active") do
          sub_map
        else
          {:error, reason} -> Repo.rollback(reason)
        end
      end)
    end
  end

  @spec update_sub_map(Scope.t(), SubMap.t(), map()) ::
          Types.ecto_result(SubMap.t()) | Types.forbidden()
  def update_sub_map(%Scope{user: user}, %SubMap{} = sub_map, attrs) do
    if Policy.can_edit_sub_map?(user, sub_map) do
      sub_map
      |> SubMap.changeset(stringify_keys(attrs))
      |> Repo.update()
    else
      {:error, :forbidden}
    end
  end

  @spec update_pin_type_settings(Scope.t(), SubMap.t(), map()) ::
          Types.ecto_result(SubMap.t()) | Types.forbidden()
  def update_pin_type_settings(%Scope{user: user}, %SubMap{} = sub_map, attrs) do
    membership = get_membership(sub_map.id, user.id)

    if Policy.can_moderate?(user, sub_map, membership) do
      settings =
        sub_map.settings
        |> PinTypeSettings.merge_pin_type_settings(attrs)

      sub_map
      |> Ecto.Changeset.change(%{settings: settings})
      |> Repo.update()
    else
      {:error, :forbidden}
    end
  end

  @spec join(Scope.t(), SubMap.t()) :: Types.ecto_result(Membership.t())
  def join(%Scope{user: %User{} = user}, %SubMap{} = sub_map) do
    if AccountsPolicy.muted?(user) do
      {:error, :forbidden}
    else
      do_join(user, sub_map)
    end
  end

  defp do_join(%User{} = user, %SubMap{} = sub_map) do
    case get_membership(sub_map.id, user.id) do
      %Membership{status: :active} = m ->
        {:ok, m}

      %Membership{status: :banned} ->
        {:error, :banned}

      %Membership{} = m ->
        m
        |> Membership.changeset(%{"status" => "active"})
        |> Repo.update()

      nil ->
        insert_membership(sub_map.id, user.id, "member", "active")
    end
  end

  @spec leave(Scope.t(), SubMap.t()) :: Types.ecto_ok(Membership.t()) | leave_error()
  def leave(%Scope{user: %User{} = user}, %SubMap{} = sub_map) do
    case get_membership(sub_map.id, user.id) do
      %Membership{role: :owner} ->
        {:error, :owner_cannot_leave}

      %Membership{} = m ->
        Repo.delete(m)

      nil ->
        {:error, :not_member}
    end
  end

  @spec list_pins(SubMap.t(), User.t() | nil, Membership.t() | nil) :: [Pin.t()]
  def list_pins(%SubMap{} = sub_map, viewer, membership) do
    query =
      if Policy.can_moderate?(viewer, sub_map, membership) do
        Query.sub_map_pins_for_mod(sub_map.id)
      else
        Query.sub_map_pins(sub_map.id)
      end

    Repo.all(query)
    |> Repo.preload(Storymap.Pins.Query.list_preloads())
  end

  @spec pending_pins(SubMap.t()) :: [Pin.t()]
  def pending_pins(%SubMap{} = sub_map) do
    Repo.all(Query.pending_pins(sub_map.id))
  end

  @spec approve_pin(Scope.t(), SubMap.t(), integer()) ::
          Types.ecto_ok(Pin.t()) | moderation_error()
  def approve_pin(%Scope{user: user}, %SubMap{} = sub_map, pin_id) do
    with %Pin{} = pin <- get_sub_map_pin(sub_map, pin_id),
         membership <- get_membership(sub_map.id, user.id),
         true <- Policy.can_moderate?(user, sub_map, membership),
         {:ok, pin} <-
           pin
           |> Ecto.Changeset.change(%{status: :approved})
           |> Repo.update() do
      {:ok, Repo.preload(pin, [:tags, :sub_map])}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  @spec reject_pin(Scope.t(), SubMap.t(), integer()) ::
          Types.ecto_ok(Pin.t()) | moderation_error()
  def reject_pin(%Scope{user: user}, %SubMap{} = sub_map, pin_id) do
    with %Pin{} = pin <- get_sub_map_pin(sub_map, pin_id),
         membership <- get_membership(sub_map.id, user.id),
         true <- Policy.can_moderate?(user, sub_map, membership),
         {:ok, pin} <-
           pin
           |> Ecto.Changeset.change(%{status: :rejected})
           |> Repo.update() do
      {:ok, Repo.preload(pin, [:tags, :sub_map])}
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  @spec create_pin_in_sub_map(Scope.t(), SubMap.t(), map()) ::
          Types.ecto_result(Pin.t()) | Types.authorize_result()
  def create_pin_in_sub_map(%Scope{user: user}, %SubMap{} = sub_map, attrs) do
    membership = get_membership(sub_map.id, user.id)

    with :ok <- Authorizer.authorize_create_in_sub_map(user, sub_map, membership),
         attrs <- prepare_pin_attrs(sub_map, attrs, membership, user) do
      Pins.create_pin(attrs, user.id, sub_map: sub_map)
    end
  end

  defp prepare_pin_attrs(%SubMap{} = sub_map, attrs, membership, user) do
    attrs = stringify_keys(attrs)

    can_moderate? = Policy.can_moderate?(user, sub_map, membership)

    status =
      cond do
        sub_map.contribution_mode != :approval_required -> "approved"
        can_moderate? -> "approved"
        true -> "pending"
      end

    visible = Visibility.initial_visible_on_world_map(attrs, sub_map, user, membership)

    tags =
      attrs
      |> Map.get("tags", [])
      |> List.wrap()
      |> CommunityTag.merge(sub_map)

    attrs
    |> Map.put("tags", tags)
    |> Map.put("sub_map_id", sub_map.id)
    |> Map.put("status", status)
    |> Map.put("visible_on_world_map", visible)
  end

  defp get_sub_map_pin(%SubMap{id: id}, pin_id) do
    Repo.one(from(p in Pin, where: p.id == ^pin_id and p.sub_map_id == ^id))
  end

  defp insert_membership(sub_map_id, user_id, role, status) do
    %Membership{}
    |> Membership.changeset(%{
      "sub_map_id" => sub_map_id,
      "user_id" => user_id,
      "role" => role,
      "status" => status
    })
    |> Repo.insert()
  end

  defp stringify_keys(attrs) when is_map(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
