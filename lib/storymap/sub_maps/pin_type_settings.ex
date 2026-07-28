defmodule Storymap.SubMaps.PinTypeSettings do
  @moduledoc """
  Community pin type allowlist, stored in the `sub_map_pin_types` join table.

  Settings JSON no longer carries pin type allowlists; `normalize_settings/1`
  strips the obsolete keys while leaving all other settings untouched.
  """

  import Ecto.Query

  alias Storymap.PinTypes.PinType
  alias Storymap.Repo
  alias Storymap.SubMaps.{SubMap, SubMapPinType}

  @obsolete_keys ~w(enabled_builtin_pin_types enabled_custom_pin_types allowed_pin_types)

  @spec normalize_settings(map() | nil) :: map()
  def normalize_settings(settings) when is_map(settings) do
    Enum.reduce(@obsolete_keys, settings, fn key, acc ->
      acc
      |> Map.delete(key)
      |> drop_atom_key(key)
    end)
  end

  def normalize_settings(_), do: %{}

  @spec enabled_pin_type_ids(SubMap.t() | integer()) :: [integer()]
  def enabled_pin_type_ids(%SubMap{id: id}), do: enabled_pin_type_ids(id)

  def enabled_pin_type_ids(sub_map_id) when is_integer(sub_map_id) do
    from(j in SubMapPinType,
      where: j.sub_map_id == ^sub_map_id,
      select: j.pin_type_id
    )
    |> Repo.all()
  end

  def enabled_pin_type_ids(_), do: []

  @spec pin_type_allowed?(SubMap.t() | integer(), integer() | nil) :: boolean()
  def pin_type_allowed?(%SubMap{id: id}, pin_type_id), do: pin_type_allowed?(id, pin_type_id)

  def pin_type_allowed?(sub_map_id, pin_type_id)
      when is_integer(sub_map_id) and is_integer(pin_type_id) do
    Repo.exists?(
      from j in SubMapPinType,
        where: j.sub_map_id == ^sub_map_id and j.pin_type_id == ^pin_type_id
    )
  end

  def pin_type_allowed?(_, _), do: false

  @doc """
  Replaces the community allowlist with the given pin type ids (existing rows are pruned).
  """
  @spec replace_enabled_pin_types(SubMap.t() | integer(), [integer() | String.t()]) :: :ok
  def replace_enabled_pin_types(%SubMap{id: id}, pin_type_ids),
    do: replace_enabled_pin_types(id, pin_type_ids)

  def replace_enabled_pin_types(sub_map_id, pin_type_ids)
      when is_integer(sub_map_id) and is_list(pin_type_ids) do
    ids = existing_pin_type_ids(pin_type_ids)

    Repo.transaction(fn ->
      from(j in SubMapPinType,
        where: j.sub_map_id == ^sub_map_id and j.pin_type_id not in ^ids
      )
      |> Repo.delete_all()

      current = MapSet.new(enabled_pin_type_ids(sub_map_id))

      ids
      |> Enum.reject(&MapSet.member?(current, &1))
      |> Enum.each(fn pin_type_id ->
        %SubMapPinType{}
        |> SubMapPinType.changeset(%{"sub_map_id" => sub_map_id, "pin_type_id" => pin_type_id})
        |> Repo.insert!()
      end)
    end)

    :ok
  end

  def replace_enabled_pin_types(_, _), do: :ok

  @doc """
  Extracts pin type ids from wire attrs, accepting `enabled_pin_type_ids` (ids)
  or `enabled_pin_types` (slugs). Returns `nil` when neither key is present.
  """
  @spec pin_type_ids_from_attrs(map()) :: [integer()] | nil
  def pin_type_ids_from_attrs(attrs) when is_map(attrs) do
    cond do
      list = get_list(attrs, "enabled_pin_type_ids") -> existing_pin_type_ids(list)
      list = get_list(attrs, "enabled_pin_types") -> ids_from_slugs(list)
      true -> nil
    end
  end

  def pin_type_ids_from_attrs(_), do: nil

  defp get_list(attrs, key) do
    case Map.get(attrs, key) || Map.get(attrs, String.to_atom(key)) do
      list when is_list(list) -> list
      _ -> nil
    end
  end

  defp ids_from_slugs(slugs) do
    slugs = Enum.filter(slugs, &(is_binary(&1) and &1 != ""))

    from(t in PinType, where: t.slug in ^slugs, select: t.id)
    |> Repo.all()
  end

  defp existing_pin_type_ids(ids) do
    ids =
      ids
      |> Enum.map(&normalize_id/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.uniq()

    from(t in PinType, where: t.id in ^ids, select: t.id)
    |> Repo.all()
  end

  defp normalize_id(id) when is_integer(id), do: id

  defp normalize_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {int, ""} -> int
      _ -> nil
    end
  end

  defp normalize_id(_), do: nil

  defp drop_atom_key(settings, key) do
    Map.delete(settings, String.to_existing_atom(key))
  rescue
    ArgumentError -> settings
  end
end
