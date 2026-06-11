defmodule Storymap.Pins do
  @moduledoc """
  The Pins context.
  """

  import Ecto.Query, warn: false
  import Ecto.Changeset, only: [validate_inclusion: 3, add_error: 3]
  alias Storymap.Repo
  alias Storymap.Pins.{Pin, Query}
  alias Storymap.SubMaps
  alias Storymap.SubMaps.{Policy, SubMap}

  def list_pins do
    Query.world_pins()
    |> Repo.all()
  end

  def list_pins_by_user(user_id) when is_integer(user_id) do
    Query.by_user(user_id)
    |> Repo.all()
  end

  def get_pin!(id), do: Repo.get!(Pin, id) |> Repo.preload(:tags)

  def get_pin(id) when is_integer(id) do
    case Repo.get(Pin, id) do
      nil -> nil
      %Pin{} = pin -> Repo.preload(pin, [:tags, :sub_map])
    end
  end

  def create_pin(attrs, user_id, opts \\ []) do
    attrs_with_user = Map.put(stringify_keys(attrs), "user_id", user_id)
    sub_map = Keyword.get(opts, :sub_map)

    tags = Map.get(attrs_with_user, "tags", [])

    case Storymap.Tags.get_or_create_tags_by_names(tags) do
      {:ok, tag_structs} ->
        %Pin{}
        |> Pin.changeset(attrs_with_user)
        |> maybe_validate_sub_map_rules(sub_map, attrs_with_user)
        |> Ecto.Changeset.put_assoc(:tags, tag_structs)
        |> Repo.insert()

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def update_pin(%Pin{} = pin, attrs, opts \\ []) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    user = Keyword.get(opts, :user)
    membership = Keyword.get(opts, :membership)

    attrs =
      attrs
      |> stringify_keys()
      |> then(&maybe_sanitize_visible_on_world(&1, sub_map, pin, user, membership))

    tags = Map.get(attrs, "tags", [])

    case Storymap.Tags.get_or_create_tags_by_names(tags) do
      {:ok, tag_structs} ->
        pin
        |> Pin.changeset(attrs)
        |> maybe_validate_sub_map_rules(sub_map, attrs)
        |> Ecto.Changeset.put_assoc(:tags, tag_structs)
        |> Repo.update()

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  def delete_pin(%Pin{} = pin) do
    Repo.delete(pin)
  end

  def change_pin(%Pin{} = pin, attrs \\ %{}) do
    Pin.changeset(pin, attrs)
  end

  defp maybe_validate_sub_map_rules(changeset, %SubMap{} = sub_map, attrs) do
    settings = sub_map.settings || %{}
    tag_names = Map.get(attrs, "tags", [])

    changeset
    |> validate_pin_type_allowed(settings)
    |> validate_required_tags(settings, tag_names)
    |> validate_description_required(settings)
  end

  defp maybe_validate_sub_map_rules(changeset, _, _), do: changeset

  defp validate_pin_type_allowed(changeset, %{"allowed_pin_types" => types})
       when is_list(types) and types != [] do
    validate_inclusion(changeset, :pin_type, types)
  end

  defp validate_pin_type_allowed(changeset, %{allowed_pin_types: types})
       when is_list(types) and types != [] do
    validate_inclusion(changeset, :pin_type, types)
  end

  defp validate_pin_type_allowed(changeset, _), do: changeset

  defp validate_required_tags(changeset, %{"required_tags" => required}, tag_names)
       when is_list(required) and required != [] do
    tag_names = List.wrap(tag_names)

    missing =
      Enum.filter(required, fn req ->
        not Enum.any?(tag_names, &(String.downcase(to_string(&1)) == String.downcase(req)))
      end)

    if missing == [] do
      changeset
    else
      add_error(changeset, :tags, "must include: #{Enum.join(missing, ", ")}")
    end
  end

  defp validate_required_tags(changeset, %{required_tags: required}, tag_names),
    do: validate_required_tags(changeset, %{"required_tags" => required}, tag_names)

  defp validate_required_tags(changeset, _, _), do: changeset

  defp validate_description_required(changeset, %{"require_description" => true}) do
    desc = Ecto.Changeset.get_field(changeset, :description)

    if is_binary(desc) and String.trim(desc) != "" do
      changeset
    else
      add_error(changeset, :description, "is required in this community")
    end
  end

  defp validate_description_required(changeset, %{require_description: true}),
    do: validate_description_required(changeset, %{"require_description" => true})

  defp validate_description_required(changeset, _), do: changeset

  defp stringify_keys(attrs) when is_map(attrs) do
    Map.new(attrs, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp maybe_sanitize_visible_on_world(attrs, %SubMap{} = sub_map, %Pin{} = pin, user, membership) do
    case Map.get(attrs, "visible_on_world_map") do
      v when is_boolean(v) ->
        visible =
          if Policy.can_set_visible_on_world?(sub_map, user, membership),
            do: v,
            else: pin.visible_on_world_map

        Map.put(attrs, "visible_on_world_map", visible)

      _ ->
        attrs
    end
  end

  defp maybe_sanitize_visible_on_world(attrs, _, _, _, _), do: attrs
end
