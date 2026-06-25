defmodule Storymap.Pins do
  @moduledoc """
  The Pins context.
  """

  import Ecto.Changeset, only: [add_error: 3, get_field: 2]
  import Ecto.Query
  alias Storymap.Repo

  alias Storymap.Pins.{
    BlobFieldType,
    Pin,
    PinFieldBlob,
    PinReference,
    Query,
    References,
    Visibility
  }

  alias Storymap.PinTypes
  alias Storymap.PinTypes.{CustomPinType, Validator}
  alias Storymap.PinTypes.Schema, as: PinTypeSchema
  alias Storymap.SubMaps
  alias Storymap.SubMaps.{PinTypeSettings, SubMap}
  alias Storymap.Types

  @blob_field_types BlobFieldType.values()

  @type blob_upsert_result :: %{
          pin: Pin.t(),
          blob: PinFieldBlob.t()
        }

  @type blob_error :: {:error, :invalid_blob_field} | {:error, :required_blob_field}

  @spec list_pins() :: [Pin.t()]
  def list_pins do
    Query.world_pins()
    |> Repo.all()
    |> Repo.preload(Query.list_preloads())
  end

  @spec list_pins_by_user(integer()) :: [Pin.t()]
  def list_pins_by_user(user_id) when is_integer(user_id) do
    Query.by_user(user_id)
    |> Repo.all()
  end

  @spec get_pin!(integer()) :: Pin.t()
  def get_pin!(id), do: Repo.get!(Pin, id) |> preload_pin_associations()

  @spec get_pin(integer()) :: Pin.t() | nil
  def get_pin(id) when is_integer(id) do
    case Repo.get(Pin, id) do
      nil -> nil
      %Pin{} = pin -> preload_pin_associations(pin)
    end
  end

  defp preload_pin_associations(%Pin{} = pin) do
    Repo.preload(pin, Query.list_preloads(), force: true)
  end

  @doc """
  Returns the in-app map URL for a pin, using the community map when the pin belongs to one.
  """
  @spec map_path_for_pin(Pin.t()) :: String.t()
  def map_path_for_pin(%Pin{id: id, sub_map: %SubMap{community_url: url}}) do
    "/m/#{url}/map?pin=#{id}"
  end

  @spec map_path_for_pin(Pin.t()) :: String.t()
  def map_path_for_pin(%Pin{id: id}) do
    "/map?pin=#{id}"
  end

  @spec map_path_for_pin(integer()) :: String.t()
  def map_path_for_pin(pin_id) when is_integer(pin_id) do
    case get_pin(pin_id) do
      nil -> "/map?pin=#{pin_id}"
      pin -> map_path_for_pin(pin)
    end
  end

  @spec create_pin(map(), integer(), keyword()) :: Types.ecto_result(Pin.t())
  def create_pin(attrs, user_id, opts \\ []) do
    attrs_with_user = Map.put(stringify_keys(attrs), "user_id", user_id)
    sub_map = Keyword.get(opts, :sub_map)

    tags = Map.get(attrs_with_user, "tags", [])

    case Storymap.Tags.get_or_create_tags_by_names(tags) do
      {:ok, tag_structs} ->
        Repo.transaction(fn ->
          with {:ok, pin} <-
                 %Pin{}
                 |> Pin.changeset(attrs_with_user)
                 |> maybe_validate_custom_pin_data()
                 |> maybe_validate_sub_map_rules(sub_map, attrs_with_user)
                 |> Ecto.Changeset.put_assoc(:tags, tag_structs)
                 |> Repo.insert(),
               {:ok, pin} <- References.sync(pin, attrs_with_user) do
            preload_pin_associations(pin)
          else
            {:error, %Ecto.Changeset{} = changeset} -> Repo.rollback(changeset)
          end
        end)
        |> normalize_transaction_result()

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @spec update_pin(Pin.t(), map(), keyword()) :: Types.ecto_result(Pin.t())
  def update_pin(%Pin{} = pin, attrs, opts \\ []) do
    sub_map = SubMaps.resolve_for_pin(Keyword.get(opts, :sub_map), pin)
    user = Keyword.get(opts, :user)
    membership = Keyword.get(opts, :membership)

    attrs =
      attrs
      |> stringify_keys()
      |> then(&Visibility.sanitize_attrs_visible_on_world_map(&1, sub_map, pin, user, membership))

    tags = Map.get(attrs, "tags", [])

    case Storymap.Tags.get_or_create_tags_by_names(tags) do
      {:ok, tag_structs} ->
        Repo.transaction(fn ->
          with {:ok, pin} <-
                 pin
                 |> Pin.changeset(attrs)
                 |> maybe_validate_custom_pin_data()
                 |> maybe_validate_sub_map_rules(sub_map, attrs)
                 |> Ecto.Changeset.put_assoc(:tags, tag_structs)
                 |> Repo.update(),
               {:ok, pin} <- References.sync(pin, attrs) do
            preload_pin_associations(pin)
          else
            {:error, %Ecto.Changeset{} = changeset} -> Repo.rollback(changeset)
          end
        end)
        |> normalize_transaction_result()

      {:error, changeset} ->
        {:error, changeset}
    end
  end

  @spec delete_pin(Pin.t()) :: Types.ecto_result(Pin.t())
  def delete_pin(%Pin{} = pin) do
    Repo.delete(pin)
  end

  @spec change_pin(Pin.t(), map()) :: Ecto.Changeset.t()
  def change_pin(%Pin{} = pin, attrs \\ %{}) do
    Pin.changeset(pin, attrs)
  end

  @doc """
  Returns a field blob payload for the given pin, field key, and type, or nil.
  """
  @spec get_field_blob(integer(), String.t(), PinFieldBlob.blob_type()) :: PinFieldBlob.t() | nil
  def get_field_blob(pin_id, field_key, type)
      when is_integer(pin_id) and is_binary(field_key) and type in @blob_field_types do
    Repo.one(
      from b in PinFieldBlob,
        where: b.pin_id == ^pin_id and b.field_key == ^field_key and b.type == ^type
    )
  end

  @doc """
  Creates or updates a field blob and stores only a reference in `pins.custom_data`.

  Returns `{:ok, %{pin: pin, blob: blob}}` on success.
  """
  @spec upsert_field_blob(Pin.t(), String.t(), PinFieldBlob.blob_type(), map()) ::
          Types.ecto_ok(blob_upsert_result()) | Types.ecto_err() | blob_error()
  def upsert_field_blob(%Pin{} = pin, field_key, type, attrs)
      when is_binary(field_key) and type in @blob_field_types and is_map(attrs) do
    with :ok <- validate_blob_field_key(pin, field_key, type) do
      format =
        Map.get(attrs, "format") || Map.get(attrs, :format) || BlobFieldType.default_format(type)

      version = Map.get(attrs, "version") || Map.get(attrs, :version) || 1
      payload = Map.get(attrs, "payload") || Map.get(attrs, :payload)

      changeset =
        %PinFieldBlob{}
        |> PinFieldBlob.changeset(%{
          pin_id: pin.id,
          field_key: field_key,
          type: type,
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
  Deletes a field blob and removes its reference from `pins.custom_data`.

  Returns `{:ok, pin}` on success, or `{:error, changeset}`.
  """
  @spec delete_field_blob(Pin.t(), String.t(), PinFieldBlob.blob_type()) ::
          Types.ecto_ok(Pin.t()) | Types.ecto_err() | blob_error()
  def delete_field_blob(%Pin{} = pin, field_key, type)
      when is_binary(field_key) and type in @blob_field_types do
    with :ok <- validate_blob_field_key(pin, field_key, type),
         :ok <- validate_blob_field_not_required(pin, field_key, type) do
      Repo.transaction(fn ->
        _ =
          from(b in PinFieldBlob,
            where: b.pin_id == ^pin.id and b.field_key == ^field_key and b.type == ^type
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

  @spec get_music_blob(integer(), String.t()) :: PinFieldBlob.t() | nil
  def get_music_blob(pin_id, field_key), do: get_field_blob(pin_id, field_key, :music)

  @spec upsert_music_blob(Pin.t(), String.t(), map()) ::
          Types.ecto_ok(blob_upsert_result()) | Types.ecto_err() | blob_error()
  def upsert_music_blob(%Pin{} = pin, field_key, attrs),
    do: upsert_field_blob(pin, field_key, :music, attrs)

  @spec delete_music_blob(Pin.t(), String.t()) ::
          Types.ecto_ok(Pin.t()) | Types.ecto_err() | blob_error()
  def delete_music_blob(%Pin{} = pin, field_key),
    do: delete_field_blob(pin, field_key, :music)

  defp update_pin_custom_data(%Pin{} = pin, custom_data) when is_map(custom_data) do
    pin
    |> Pin.changeset(%{"custom_data" => custom_data})
    |> maybe_validate_custom_pin_data()
    |> Repo.update()
  end

  defp validate_blob_field_key(%Pin{pin_type: "custom:" <> _} = pin, field_key, type)
       when type in @blob_field_types do
    case PinTypes.get_by_pin_type(pin.pin_type) do
      %CustomPinType{} = custom_type ->
        fields = PinTypeSchema.fields(custom_type.schema)

        if Enum.any?(fields, fn f ->
             field_key(f) == field_key and field_type(f) == to_string(type)
           end) do
          :ok
        else
          {:error, :invalid_blob_field}
        end

      _ ->
        {:error, :invalid_blob_field}
    end
  end

  defp validate_blob_field_key(_pin, _field_key, _type), do: {:error, :invalid_blob_field}

  defp validate_blob_field_not_required(%Pin{pin_type: "custom:" <> _} = pin, field_key, type)
       when type in @blob_field_types do
    case PinTypes.get_by_pin_type(pin.pin_type) do
      %CustomPinType{} = custom_type ->
        fields = PinTypeSchema.fields(custom_type.schema)

        if Enum.any?(fields, fn f ->
             field_key(f) == field_key and field_type(f) == to_string(type) and
               required_field?(f)
           end) do
          {:error, :required_blob_field}
        else
          :ok
        end

      _ ->
        :ok
    end
  end

  defp validate_blob_field_not_required(_pin, _field_key, _type), do: :ok

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

  @doc """
  Lists backlinks (incoming references) for a pin.
  """
  @spec list_backlinks(integer()) :: [PinReference.t()]
  def list_backlinks(target_pin_id) when is_integer(target_pin_id) do
    from(r in PinReference,
      where: r.target_pin_id == ^target_pin_id,
      order_by: [asc: r.inserted_at]
    )
    |> Repo.all()
  end

  defp normalize_transaction_result({:ok, pin}), do: {:ok, pin}

  defp normalize_transaction_result({:error, %Ecto.Changeset{} = changeset}),
    do: {:error, changeset}

  defp normalize_transaction_result({:error, reason}), do: {:error, reason}
end
