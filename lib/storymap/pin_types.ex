defmodule Storymap.PinTypes do
  @moduledoc """
  Unified global pin type catalog.
  """

  import Ecto.Query

  alias Storymap.Accounts.Scope
  alias Storymap.Accounts.User
  alias Storymap.Pins.Pin
  alias Storymap.PinTypes.{PinType, Policy}
  alias Storymap.Repo
  alias Storymap.SubMaps.SubMapPinType
  alias Storymap.Types

  @type delete_error :: Types.forbidden() | {:error, :in_use} | {:error, :system_type}

  @spec list_enabled_pin_types() :: [PinType.t()]
  def list_enabled_pin_types do
    PinType
    |> where([t], t.enabled == true)
    |> order_by([t], asc: t.label)
    |> Repo.all()
  end

  @spec list_all_pin_types() :: [PinType.t()]
  def list_all_pin_types do
    PinType
    |> order_by([t], asc: t.label)
    |> Repo.all()
  end

  @spec get_pin_type!(integer()) :: PinType.t()
  def get_pin_type!(id), do: Repo.get!(PinType, id)

  @spec get_pin_type(integer()) :: PinType.t() | nil
  def get_pin_type(id) when is_integer(id), do: Repo.get(PinType, id)
  def get_pin_type(_), do: nil

  @spec get_by_slug(String.t()) :: PinType.t() | nil
  def get_by_slug(slug) when is_binary(slug) do
    Repo.get_by(PinType, slug: slug)
  end

  def get_by_slug(_), do: nil

  @doc """
  Resolves a catalog type from `pin_type_id` and/or `pin_type` (slug) attrs.
  Prefers id when both are present and must agree. Returns `:missing` when neither is set.
  """
  @spec resolve_pin_type(map()) ::
          {:ok, PinType.t()}
          | {:error, :not_found}
          | {:error, :mismatch}
          | {:error, :missing}
  def resolve_pin_type(attrs) when is_map(attrs) do
    id = parse_id(Map.get(attrs, "pin_type_id") || Map.get(attrs, :pin_type_id))
    slug = Map.get(attrs, "pin_type") || Map.get(attrs, :pin_type)

    slug = if is_binary(slug), do: String.trim(slug), else: nil
    slug = if slug == "", do: nil, else: slug

    cond do
      is_integer(id) and is_binary(slug) ->
        case get_pin_type(id) do
          %PinType{slug: ^slug} = pin_type -> {:ok, pin_type}
          %PinType{} -> {:error, :mismatch}
          nil -> {:error, :not_found}
        end

      is_integer(id) ->
        case get_pin_type(id) do
          %PinType{} = pin_type -> {:ok, pin_type}
          nil -> {:error, :not_found}
        end

      is_binary(slug) ->
        case get_by_slug(slug) do
          %PinType{} = pin_type -> {:ok, pin_type}
          nil -> {:error, :not_found}
        end

      true ->
        {:error, :missing}
    end
  end

  @spec create_pin_type(Scope.t() | any(), map()) ::
          Types.ecto_result(PinType.t()) | Types.forbidden() | Types.unauthorized()
  def create_pin_type(%Scope{user: %User{} = user}, attrs) do
    if Policy.can_create?(user) do
      attrs = stringify_keys(attrs)

      %PinType{created_by_user_id: user.id}
      |> PinType.changeset(attrs)
      |> Repo.insert()
    else
      {:error, :forbidden}
    end
  end

  def create_pin_type(_, _), do: {:error, :unauthorized}

  @spec update_pin_type(Scope.t(), PinType.t(), map()) ::
          Types.ecto_result(PinType.t()) | Types.forbidden()
  def update_pin_type(%Scope{user: user}, %PinType{} = pin_type, attrs) do
    if Policy.can_edit?(user, pin_type) do
      pin_type
      |> PinType.changeset(stringify_keys(attrs))
      |> Repo.update()
    else
      {:error, :forbidden}
    end
  end

  @spec delete_pin_type(Scope.t(), PinType.t()) ::
          Types.ecto_result(PinType.t()) | delete_error()
  def delete_pin_type(%Scope{user: user}, %PinType{} = pin_type) do
    cond do
      pin_type.is_system ->
        {:error, :system_type}

      not Policy.can_delete?(user, pin_type) ->
        {:error, :forbidden}

      pin_type_in_use?(pin_type) ->
        {:error, :in_use}

      true ->
        Repo.delete(pin_type)
    end
  end

  @spec list_pin_types_for_sub_map(Storymap.SubMaps.SubMap.t() | integer()) :: [PinType.t()]
  def list_pin_types_for_sub_map(%Storymap.SubMaps.SubMap{id: id}),
    do: list_pin_types_for_sub_map(id)

  def list_pin_types_for_sub_map(sub_map_id) when is_integer(sub_map_id) do
    from(t in PinType,
      join: j in SubMapPinType,
      on: j.pin_type_id == t.id,
      where: j.sub_map_id == ^sub_map_id and t.enabled == true,
      order_by: [asc: t.label]
    )
    |> Repo.all()
  end

  def list_pin_types_for_sub_map(_), do: []

  @spec available_pin_types_for_world() :: [PinType.t()]
  def available_pin_types_for_world do
    list_enabled_pin_types()
  end

  @spec change_pin_type(PinType.t(), map()) :: Ecto.Changeset.t()
  def change_pin_type(%PinType{} = pin_type, attrs \\ %{}) do
    PinType.changeset(pin_type, attrs)
  end

  defp pin_type_in_use?(%PinType{id: id}) do
    Repo.exists?(from p in Pin, where: p.pin_type_id == ^id)
  end

  defp parse_id(id) when is_integer(id), do: id

  defp parse_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {n, ""} -> n
      _ -> nil
    end
  end

  defp parse_id(_), do: nil

  defp stringify_keys(attrs) when is_map(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end
end
