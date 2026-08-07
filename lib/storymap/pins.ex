defmodule Storymap.Pins do
  @moduledoc """
  The Pins context.
  """

  import Ecto.Changeset, only: [add_error: 3]
  import Ecto.Query
  alias Storymap.Repo

  alias Storymap.Pins.{
    AdHocFields,
    BlobFieldType,
    Pin,
    PinFieldBlob,
    PinReference,
    Query,
    References,
    Visibility
  }

  alias Storymap.Accounts.User
  alias Storymap.PinTypes
  alias Storymap.PinTypes.{PinType, Validator}
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

    {pin_type, type_error} = resolve_pin_type_for(%Pin{}, attrs_with_user)
    attrs_with_user = put_pin_type_id(attrs_with_user, pin_type)

    case Storymap.Tags.get_or_create_tags_by_names(tags) do
      {:ok, tag_structs} ->
        Repo.transaction(fn ->
          with {:ok, pin} <-
                 %Pin{}
                 |> Pin.changeset(attrs_with_user)
                 |> maybe_add_pin_type_error(type_error)
                 |> maybe_put_privileged_create_fields(sub_map, attrs_with_user)
                 |> validate_custom_pin_data(pin_type)
                 |> normalize_schedule(pin_type)
                 |> maybe_validate_sub_map_rules(sub_map, attrs_with_user, pin_type)
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
    {pin_type, type_error} = resolve_pin_type_for(pin, attrs)
    attrs = put_pin_type_id(attrs, pin_type)

    case Storymap.Tags.get_or_create_tags_by_names(tags) do
      {:ok, tag_structs} ->
        Repo.transaction(fn ->
          with {:ok, pin} <-
                 pin
                 |> Pin.changeset(attrs)
                 |> maybe_add_pin_type_error(type_error)
                 |> maybe_put_visible_on_world_map(attrs)
                 |> maybe_resubmit_rejected_pin(pin, sub_map, user)
                 |> validate_custom_pin_data(pin_type)
                 |> normalize_schedule(pin_type)
                 |> maybe_validate_sub_map_rules(sub_map, attrs, pin_type)
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
    with {:ok, target} <- resolve_blob_field(pin, field_key, type) do
      format = BlobFieldType.default_format(type)
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

        {:ok, pin} = put_blob_ref(pin, target, field_key, blob.id)

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
    with {:ok, target} <- resolve_blob_field(pin, field_key, type),
         :ok <- validate_blob_field_not_required(pin, field_key, type) do
      Repo.transaction(fn ->
        _ =
          from(b in PinFieldBlob,
            where: b.pin_id == ^pin.id and b.field_key == ^field_key and b.type == ^type
          )
          |> Repo.delete_all()

        {:ok, pin} = clear_blob_ref(pin, target, field_key)
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

  defp update_pin_fields(%Pin{} = pin, attrs) do
    {pin_type, _error} = existing_pin_type(pin)

    pin
    |> Pin.changeset(attrs)
    |> validate_custom_pin_data(pin_type)
    |> Repo.update()
  end

  defp put_blob_ref(%Pin{} = pin, :custom_data, field_key, blob_id) do
    custom_data = Map.put(pin.custom_data || %{}, field_key, %{"ref" => blob_id})
    update_pin_fields(pin, %{"custom_data" => custom_data})
  end

  defp put_blob_ref(%Pin{} = pin, :ad_hoc, field_key, blob_id) do
    fields = AdHocFields.put_blob_ref(pin.ad_hoc_fields || [], field_key, blob_id)
    update_pin_fields(pin, %{"ad_hoc_fields" => fields})
  end

  defp clear_blob_ref(%Pin{} = pin, :custom_data, field_key) do
    custom_data = Map.delete(pin.custom_data || %{}, field_key)
    update_pin_fields(pin, %{"custom_data" => custom_data})
  end

  defp clear_blob_ref(%Pin{} = pin, :ad_hoc, field_key) do
    fields = AdHocFields.clear_blob_ref(pin.ad_hoc_fields || [], field_key)
    update_pin_fields(pin, %{"ad_hoc_fields" => fields})
  end

  # A blob field key may name a field in the pin type schema or an ad-hoc field id.
  defp resolve_blob_field(%Pin{} = pin, field_key, type) when type in @blob_field_types do
    cond do
      schema_blob_field(pin, field_key, type) != nil -> {:ok, :custom_data}
      ad_hoc_blob_field?(pin, field_key, type) -> {:ok, :ad_hoc}
      true -> {:error, :invalid_blob_field}
    end
  end

  defp schema_blob_field(%Pin{} = pin, field_key, type) do
    case existing_pin_type(pin) do
      {%PinType{} = pin_type, _} ->
        pin_type.schema
        |> PinTypeSchema.fields()
        |> Enum.find(fn f ->
          field_key(f) == field_key and field_type(f) == to_string(type)
        end)

      _ ->
        nil
    end
  end

  defp ad_hoc_blob_field?(%Pin{ad_hoc_fields: fields}, field_key, type) when is_list(fields) do
    case AdHocFields.find_field(fields, field_key) do
      nil -> false
      field -> field_type(field) == to_string(type)
    end
  end

  defp ad_hoc_blob_field?(_pin, _field_key, _type), do: false

  defp validate_blob_field_not_required(%Pin{} = pin, field_key, type)
       when type in @blob_field_types do
    case schema_blob_field(pin, field_key, type) do
      nil -> :ok
      field -> if required_field?(field), do: {:error, :required_blob_field}, else: :ok
    end
  end

  defp field_key(%{"key" => key}) when is_binary(key), do: key
  defp field_key(%{key: key}) when is_binary(key), do: key
  defp field_key(_), do: nil

  defp field_type(%{"type" => type}) when is_binary(type), do: type
  defp field_type(%{type: type}) when is_binary(type), do: type
  defp field_type(_), do: nil

  defp required_field?(%{"required" => true}), do: true
  defp required_field?(%{required: true}), do: true
  defp required_field?(_), do: false

  @doc """
  Resolves the catalog type for the given attrs, falling back to the pin's current type.

  Returns `{pin_type_or_nil, error_reason_or_nil}`.
  """
  @spec resolve_pin_type_for(Pin.t(), map()) :: {PinType.t() | nil, atom() | nil}
  def resolve_pin_type_for(%Pin{} = pin, attrs) do
    case PinTypes.resolve_pin_type(attrs) do
      {:ok, %PinType{} = pin_type} -> {pin_type, nil}
      {:error, :missing} -> existing_pin_type(pin)
      {:error, _} -> {nil, :not_found}
    end
  end

  defp existing_pin_type(%Pin{pin_type_id: nil}), do: {nil, nil}

  defp existing_pin_type(%Pin{pin_type: %PinType{} = pin_type}), do: {pin_type, nil}

  defp existing_pin_type(%Pin{pin_type_id: id}) do
    case PinTypes.get_pin_type(id) do
      %PinType{} = pin_type -> {pin_type, nil}
      nil -> {nil, :not_found}
    end
  end

  defp put_pin_type_id(attrs, %PinType{id: id}), do: Map.put(attrs, "pin_type_id", id)
  defp put_pin_type_id(attrs, nil), do: Map.delete(attrs, "pin_type_id")

  defp maybe_add_pin_type_error(changeset, :not_found),
    do: add_error(changeset, :pin_type, "is invalid")

  defp maybe_add_pin_type_error(changeset, _error), do: changeset

  defp maybe_validate_sub_map_rules(changeset, %SubMap{} = sub_map, attrs, pin_type) do
    settings = PinTypeSettings.normalize_settings(sub_map.settings || %{})
    tag_names = Map.get(attrs, "tags", [])

    changeset
    |> validate_pin_type_allowed(sub_map, pin_type)
    |> validate_required_tags(settings, tag_names)
    |> validate_description_required(settings)
  end

  defp maybe_validate_sub_map_rules(changeset, nil, _attrs, pin_type) do
    validate_world_pin_type_allowed(changeset, pin_type)
  end

  defp validate_custom_pin_data(changeset, %PinType{enabled: true} = pin_type) do
    Validator.validate_custom_data(changeset, pin_type)
  end

  defp validate_custom_pin_data(changeset, %PinType{}) do
    add_error(changeset, :pin_type, "uses a disabled pin type")
  end

  defp validate_custom_pin_data(changeset, nil), do: changeset

  defp normalize_schedule(changeset, %PinType{time_mode: :hours}), do: changeset

  defp normalize_schedule(changeset, %PinType{time_mode: :one_time}),
    do: Pin.clear_schedule_rrule(changeset)

  defp normalize_schedule(changeset, %PinType{time_mode: :none}),
    do: Pin.clear_schedule_fields(changeset)

  defp normalize_schedule(changeset, nil), do: changeset

  defp validate_world_pin_type_allowed(changeset, %PinType{enabled: true}), do: changeset

  defp validate_world_pin_type_allowed(changeset, %PinType{}),
    do: add_error(changeset, :pin_type, "is not allowed")

  defp validate_world_pin_type_allowed(changeset, nil), do: changeset

  defp validate_pin_type_allowed(changeset, %SubMap{} = sub_map, %PinType{} = pin_type) do
    if pin_type.enabled and PinTypeSettings.pin_type_allowed?(sub_map, pin_type.id) do
      changeset
    else
      add_error(changeset, :pin_type, "is not allowed in this community")
    end
  end

  defp validate_pin_type_allowed(changeset, _sub_map, nil), do: changeset

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

  defp maybe_put_privileged_create_fields(changeset, %SubMap{} = sub_map, attrs) do
    status =
      case Map.get(attrs, "status") do
        v when is_binary(v) -> v
        v when is_atom(v) -> to_string(v)
        _ -> nil
      end

    visible =
      case Map.get(attrs, "visible_on_world_map") do
        v when is_boolean(v) -> v
        _ -> nil
      end

    changeset
    |> Ecto.Changeset.put_change(:sub_map_id, sub_map.id)
    |> maybe_put_status(status)
    |> maybe_put_boolean(:visible_on_world_map, visible)
  end

  defp maybe_put_privileged_create_fields(changeset, nil, _attrs) do
    changeset
    |> Ecto.Changeset.put_change(:sub_map_id, nil)
    |> Ecto.Changeset.put_change(:status, :approved)
    |> Ecto.Changeset.put_change(:visible_on_world_map, true)
  end

  defp maybe_put_visible_on_world_map(changeset, attrs) do
    case Map.get(attrs, "visible_on_world_map") do
      v when is_boolean(v) -> Ecto.Changeset.put_change(changeset, :visible_on_world_map, v)
      _ -> changeset
    end
  end

  # Owner edit of a rejected pin in approval_required communities re-enters the queue.
  @spec maybe_resubmit_rejected_pin(
          Ecto.Changeset.t(),
          Pin.t(),
          SubMap.t() | nil,
          User.t() | nil
        ) :: Ecto.Changeset.t()
  defp maybe_resubmit_rejected_pin(
         changeset,
         %Pin{status: :rejected, user_id: user_id},
         %SubMap{contribution_mode: :approval_required},
         %User{id: user_id}
       ) do
    Ecto.Changeset.put_change(changeset, :status, :pending)
  end

  defp maybe_resubmit_rejected_pin(changeset, _pin, _sub_map, _user), do: changeset

  defp maybe_put_status(changeset, nil), do: changeset

  defp maybe_put_status(changeset, value) when is_binary(value) do
    case status_atom(value) do
      nil -> changeset
      status -> Ecto.Changeset.put_change(changeset, :status, status)
    end
  end

  defp status_atom(value) when is_binary(value) do
    Enum.find(Pin.statuses(), fn status -> to_string(status) == value end)
  end

  defp maybe_put_boolean(changeset, _field, nil), do: changeset

  defp maybe_put_boolean(changeset, field, value) when is_boolean(value) do
    Ecto.Changeset.put_change(changeset, field, value)
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
