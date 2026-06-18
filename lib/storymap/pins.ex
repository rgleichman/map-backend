defmodule Storymap.Pins do
  @moduledoc """
  The Pins context.
  """

  import Ecto.Changeset, only: [add_error: 3, get_field: 2]
  import Ecto.Query, only: [from: 2]
  alias Storymap.Repo
  alias Storymap.Pins.{Pin, PinFieldBlob, Query}
  alias Storymap.PinTypes
  alias Storymap.PinTypes.{CustomPinType, Validator}
  alias Storymap.PinTypes.Schema, as: PinTypeSchema
  alias Storymap.SubMaps
  alias Storymap.SubMaps.{PinTypeSettings, Policy, SubMap}

  @music_blob_type "music"

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

  @doc """
  Returns the in-app map URL for a pin, using the community map when the pin belongs to one.
  """
  def map_path_for_pin(%Pin{id: id, sub_map: %SubMap{community_url: url}}) do
    "/m/#{url}/map?pin=#{id}"
  end

  def map_path_for_pin(%Pin{id: id}) do
    "/map?pin=#{id}"
  end

  def map_path_for_pin(pin_id) when is_integer(pin_id) do
    case get_pin(pin_id) do
      nil -> "/map?pin=#{pin_id}"
      pin -> map_path_for_pin(pin)
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
        |> maybe_validate_custom_pin_data()
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
        |> maybe_validate_custom_pin_data()
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

  @doc """
  Returns the music payload blob for the given pin + field key, or nil.
  """
  def get_music_blob(pin_id, field_key)
      when is_integer(pin_id) and is_binary(field_key) do
    Repo.one(
      from b in PinFieldBlob,
        where: b.pin_id == ^pin_id and b.field_key == ^field_key and b.type == ^@music_blob_type
    )
  end

  @doc """
  Creates or updates a music payload blob and stores only a reference in `pins.custom_data`.

  Returns `{:ok, %{pin: pin, blob: blob}}` on success.
  """
  def upsert_music_blob(%Pin{} = pin, field_key, attrs)
      when is_binary(field_key) and is_map(attrs) do
    with :ok <- validate_music_field_key(pin, field_key) do
      format = Map.get(attrs, "format") || Map.get(attrs, :format) || "music/v1"
      version = Map.get(attrs, "version") || Map.get(attrs, :version) || 1
      payload = Map.get(attrs, "payload") || Map.get(attrs, :payload)

      changeset =
        %PinFieldBlob{}
        |> PinFieldBlob.changeset(%{
          pin_id: pin.id,
          field_key: field_key,
          type: @music_blob_type,
          format: format,
          version: version,
          payload: payload
        })

      Repo.transaction(fn ->
        {:ok, blob} =
          Repo.insert(
            changeset,
            on_conflict: [
              set: [
                format: format,
                version: version,
                payload: payload,
                updated_at: DateTime.utc_now(:second)
              ]
            ],
            conflict_target: [:pin_id, :field_key, :type],
            returning: true
          )

        new_custom_data =
          (pin.custom_data || %{})
          |> Map.put(field_key, %{"ref" => blob.id})

        {:ok, pin} = update_pin_custom_data(pin, new_custom_data)

        %{pin: pin, blob: blob}
      end)
      |> case do
        {:ok, result} -> {:ok, result}
        {:error, %Ecto.Changeset{} = changeset} -> {:error, changeset}
      end
    end
  end

  @doc """
  Deletes a music payload blob and removes its reference from `pins.custom_data`.

  Returns `{:ok, pin}` on success, or `{:error, changeset}`.
  """
  def delete_music_blob(%Pin{} = pin, field_key) when is_binary(field_key) do
    with :ok <- validate_music_field_key(pin, field_key),
         :ok <- validate_music_field_not_required(pin, field_key) do
      Repo.transaction(fn ->
        _ =
          from(b in PinFieldBlob,
            where:
              b.pin_id == ^pin.id and b.field_key == ^field_key and b.type == ^@music_blob_type
          )
          |> Repo.delete_all()

        new_custom_data =
          (pin.custom_data || %{})
          |> Map.delete(field_key)

        {:ok, pin} = update_pin_custom_data(pin, new_custom_data)
        pin
      end)
      |> case do
        {:ok, pin} -> {:ok, pin}
        {:error, %Ecto.Changeset{} = changeset} -> {:error, changeset}
      end
    end
  end

  defp update_pin_custom_data(%Pin{} = pin, custom_data) when is_map(custom_data) do
    pin
    |> Pin.changeset(%{"custom_data" => custom_data})
    |> maybe_validate_custom_pin_data()
    |> Repo.update()
  end

  defp validate_music_field_key(%Pin{pin_type: "custom:" <> _} = pin, field_key) do
    case PinTypes.get_by_pin_type(pin.pin_type) do
      %CustomPinType{} = custom_type ->
        fields = PinTypeSchema.fields(custom_type.schema)

        if Enum.any?(fields, fn f -> field_key(f) == field_key and field_type(f) == "music" end) do
          :ok
        else
          {:error, :invalid_music_field}
        end

      _ ->
        {:error, :invalid_music_field}
    end
  end

  defp validate_music_field_key(_pin, _field_key), do: {:error, :invalid_music_field}

  defp validate_music_field_not_required(%Pin{pin_type: "custom:" <> _} = pin, field_key) do
    case PinTypes.get_by_pin_type(pin.pin_type) do
      %CustomPinType{} = custom_type ->
        fields = PinTypeSchema.fields(custom_type.schema)

        if Enum.any?(fields, fn f ->
             field_key(f) == field_key and field_type(f) == "music" and required_field?(f)
           end) do
          {:error, :required_music_field}
        else
          :ok
        end

      _ ->
        :ok
    end
  end

  defp validate_music_field_not_required(_pin, _field_key), do: :ok

  defp field_key(%{"key" => key}) when is_binary(key), do: key
  defp field_key(%{key: key}) when is_binary(key), do: key
  defp field_key(_), do: nil

  defp field_type(%{"type" => type}) when is_binary(type), do: type
  defp field_type(%{type: type}) when is_binary(type), do: type
  defp field_type(_), do: nil

  defp required_field?(%{"required" => true}), do: true
  defp required_field?(%{required: true}), do: true
  defp required_field?(_), do: false

  defp maybe_validate_sub_map_rules(changeset, %SubMap{} = sub_map, attrs) do
    settings = PinTypeSettings.normalize_settings(sub_map.settings || %{})
    tag_names = Map.get(attrs, "tags", [])

    changeset
    |> validate_pin_type_allowed(settings)
    |> validate_required_tags(settings, tag_names)
    |> validate_description_required(settings)
  end

  defp maybe_validate_sub_map_rules(changeset, nil, attrs) do
    validate_world_pin_type_allowed(changeset, attrs)
  end

  defp maybe_validate_sub_map_rules(changeset, _, _), do: changeset

  defp maybe_validate_custom_pin_data(changeset) do
    case get_field(changeset, :pin_type) do
      "custom:" <> _slug ->
        case PinTypes.get_by_pin_type(get_field(changeset, :pin_type)) do
          %CustomPinType{enabled: true} = custom_type ->
            Validator.validate_custom_data(changeset, custom_type)

          %CustomPinType{enabled: false} ->
            add_error(changeset, :pin_type, "uses a disabled custom pin type")

          nil ->
            add_error(changeset, :pin_type, "references an unknown custom pin type")
        end

      _ ->
        changeset
    end
  end

  defp validate_world_pin_type_allowed(changeset, _attrs) do
    pin_type = get_field(changeset, :pin_type)

    cond do
      pin_type in Pin.builtin_pin_types() ->
        changeset

      match?("custom:" <> _, pin_type) ->
        case PinTypes.get_by_pin_type(pin_type) do
          %CustomPinType{enabled: true} -> changeset
          _ -> add_error(changeset, :pin_type, "is not allowed")
        end

      true ->
        add_error(changeset, :pin_type, "is not allowed")
    end
  end

  defp validate_pin_type_allowed(changeset, settings) do
    pin_type = get_field(changeset, :pin_type)

    if PinTypeSettings.pin_type_allowed?(settings, pin_type) do
      changeset
    else
      add_error(changeset, :pin_type, "is not allowed in this community")
    end
  end

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
