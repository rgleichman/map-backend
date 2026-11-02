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
  alias Storymap.Moderation.ContentFilter
  alias Storymap.PinTypes
  alias Storymap.PinTypes.{PinType, Validator}
  alias Storymap.PinTypes.Schema, as: PinTypeSchema
  alias Storymap.SubMaps
  alias Storymap.SubMaps.{PinTypeSettings, SubMap}
  alias Storymap.Trust
  alias Storymap.Trust.Ledger
  alias Storymap.Trust.Policy, as: TrustPolicy
  alias StorymapWeb.MapPaths
  alias Storymap.Types

  @blob_field_types BlobFieldType.values()

  @type blob_upsert_result :: %{
          pin: Pin.t(),
          blob: PinFieldBlob.t()
        }

  @type blob_error :: {:error, :invalid_blob_field} | {:error, :required_blob_field}

  @spec list_pins() :: [Pin.t()]
  def list_pins do
    list_pins(nil)
  end

  @doc """
  World-visible approved pins, plus pending/rejected world pins the viewer
  is allowed to see: their own, or all pending when they can approve world pins.
  """
  @spec list_pins(User.t() | nil) :: [Pin.t()]
  def list_pins(nil) do
    Query.world_pins()
    |> Repo.all()
    |> Repo.preload(Query.list_preloads())
  end

  def list_pins(%User{} = user) do
    approved =
      Query.world_pins()
      |> Repo.all()

    own_or_queue =
      cond do
        TrustPolicy.can_approve_world?(user) ->
          from(p in Pin,
            where: is_nil(p.sub_map_id) and p.status in [^:pending, ^:rejected],
            order_by: [desc: p.updated_at]
          )
          |> Repo.all()

        true ->
          from(p in Pin,
            where:
              is_nil(p.sub_map_id) and p.user_id == ^user.id and
                p.status in [^:pending, ^:rejected],
            order_by: [desc: p.updated_at]
          )
          |> Repo.all()
      end

    (approved ++ own_or_queue)
    |> Enum.uniq_by(& &1.id)
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

  @spec list_pending_world_pins() :: [Pin.t()]
  def list_pending_world_pins do
    Query.pending_world_pins()
    |> Repo.all()
    |> Repo.preload(Query.list_preloads())
  end

  @spec approve_world_pin(User.t(), integer()) ::
          Types.ecto_ok(Pin.t()) | Types.forbidden() | {:error, :not_found}
  def approve_world_pin(%User{} = user, pin_id) when is_integer(pin_id) do
    with %Pin{sub_map_id: nil, status: :pending} = pin <- get_pin(pin_id),
         true <- TrustPolicy.can_approve_world?(user),
         {:ok, pin} <-
           pin
           |> Ecto.Changeset.change(%{status: :approved})
           |> Repo.update() do
      _ =
        Ledger.record_pin_approve(user.id, pin.user_id, pin.id, %{
          "scope" => "world",
          "gate" => "trust_or_admin"
        })

      {:ok, preload_pin_associations(pin)}
    else
      nil -> {:error, :not_found}
      %Pin{} -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
    end
  end

  @spec reject_world_pin(User.t(), integer()) ::
          Types.ecto_ok(Pin.t()) | Types.forbidden() | {:error, :not_found}
  def reject_world_pin(%User{} = user, pin_id) when is_integer(pin_id) do
    with %Pin{sub_map_id: nil, status: :pending} = pin <- get_pin(pin_id),
         true <- TrustPolicy.can_approve_world?(user),
         {:ok, pin} <-
           pin
           |> Ecto.Changeset.change(%{status: :rejected})
           |> Repo.update() do
      {:ok, preload_pin_associations(pin)}
    else
      nil -> {:error, :not_found}
      %Pin{} -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, _} = err -> err
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
    MapPaths.map_path_with_pin(url, id)
  end

  @spec map_path_for_pin(Pin.t()) :: String.t()
  def map_path_for_pin(%Pin{id: id}) do
    MapPaths.map_path_with_pin(nil, id)
  end

  @spec map_path_for_pin(integer()) :: String.t()
  def map_path_for_pin(pin_id) when is_integer(pin_id) do
    case get_pin(pin_id) do
      nil -> MapPaths.map_path_with_pin(nil, pin_id)
      pin -> map_path_for_pin(pin)
    end
  end

  @spec create_pin(map(), integer(), keyword()) :: Types.ecto_result(Pin.t())
  def create_pin(attrs, user_id, opts \\ []) do
    attrs_with_user = Map.put(stringify_keys(attrs), "user_id", user_id)
    sub_map = Keyword.get(opts, :sub_map)
    {field_blobs, attrs_with_user} = pop_field_blobs(attrs_with_user)

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
                 |> maybe_validate_sub_map_rules(sub_map, attrs_with_user, pin_type, nil)
                 |> Ecto.Changeset.put_assoc(:tags, tag_structs)
                 |> maybe_hold_flagged_content()
                 |> Repo.insert(),
               {:ok, pin} <- References.sync(pin, attrs_with_user),
               {:ok, pin} <- apply_field_blobs(pin, field_blobs),
               {:ok, pin} <- scrub_invalid_blob_refs(pin, pin_type),
               :ok <- ensure_required_blob_fields(pin, pin_type) do
            preload_pin_associations(pin)
          else
            {:error, reason} -> Repo.rollback(blob_error_changeset(reason))
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

    {field_blobs, attrs} = pop_field_blobs(attrs)
    tags_provided? = Map.has_key?(attrs, "tags")
    {pin_type, type_error} = resolve_pin_type_for(pin, attrs)
    attrs = put_pin_type_id(attrs, pin_type)

    with {:ok, tag_structs} <- resolve_tags_for_update(attrs, tags_provided?) do
      Repo.transaction(fn ->
        changeset =
          pin
          |> Pin.changeset(attrs)
          |> maybe_add_pin_type_error(type_error)
          |> maybe_put_visible_on_world_map(attrs)
          |> maybe_resubmit_rejected_pin(pin, sub_map, user)
          |> validate_custom_pin_data(pin_type)
          |> normalize_schedule(pin_type)
          |> maybe_validate_sub_map_rules(sub_map, attrs, pin_type, pin)

        changeset =
          if tags_provided? do
            Ecto.Changeset.put_assoc(changeset, :tags, tag_structs)
          else
            changeset
          end

        with {:ok, pin} <-
               changeset
               |> maybe_hold_flagged_content()
               |> Repo.update(),
             {:ok, pin} <- References.sync(pin, attrs),
             {:ok, pin} <- apply_field_blobs(pin, field_blobs),
             {:ok, pin} <- scrub_invalid_blob_refs(pin, pin_type),
             :ok <- ensure_required_blob_fields(pin, pin_type) do
          preload_pin_associations(pin)
        else
          {:error, reason} -> Repo.rollback(blob_error_changeset(reason))
        end
      end)
      |> normalize_transaction_result()
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
    Repo.transaction(fn ->
      case upsert_field_blob_in_txn(pin, field_key, type, attrs) do
        {:ok, result} -> result
        {:error, reason} -> Repo.rollback(reason)
      end
    end)
    |> case do
      {:ok, result} -> {:ok, result}
      {:error, %Ecto.Changeset{} = changeset} -> {:error, changeset}
      {:error, :invalid_blob_field} -> {:error, :invalid_blob_field}
      {:error, :required_blob_field} -> {:error, :required_blob_field}
    end
  end

  @doc false
  @spec upsert_field_blob_in_txn(Pin.t(), String.t(), PinFieldBlob.blob_type(), map()) ::
          Types.ecto_ok(blob_upsert_result()) | Types.ecto_err() | blob_error()
  def upsert_field_blob_in_txn(%Pin{} = pin, field_key, type, attrs)
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

      case Repo.insert(
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
           ) do
        {:ok, blob} ->
          case put_blob_ref(pin, target, field_key, blob.id) do
            {:ok, pin} -> {:ok, %{pin: pin, blob: blob}}
            {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
          end

        {:error, %Ecto.Changeset{} = cs} ->
          {:error, cs}
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

        case clear_blob_ref(pin, target, field_key) do
          {:ok, pin} -> pin
          {:error, reason} -> Repo.rollback(reason)
        end
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

  defp maybe_validate_sub_map_rules(changeset, %SubMap{} = sub_map, attrs, pin_type, pin) do
    settings = PinTypeSettings.normalize_settings(sub_map.settings || %{})
    tag_names = tag_names_for_validation(pin, attrs)

    changeset
    |> validate_pin_type_allowed(sub_map, pin_type)
    |> validate_required_tags(settings, tag_names)
    |> validate_description_required(settings)
  end

  defp maybe_validate_sub_map_rules(changeset, nil, _attrs, pin_type, _pin) do
    validate_world_pin_type_allowed(changeset, pin_type)
  end

  @spec tag_names_for_validation(Pin.t() | nil, map()) :: [String.t()]
  defp tag_names_for_validation(_pin, attrs) when is_map_key(attrs, "tags") do
    attrs |> Map.get("tags", []) |> List.wrap()
  end

  defp tag_names_for_validation(%Pin{} = pin, _attrs) do
    pin
    |> ensure_tags_preloaded()
    |> Map.get(:tags, [])
    |> Enum.map(& &1.name)
  end

  defp tag_names_for_validation(nil, _attrs), do: []

  @spec ensure_tags_preloaded(Pin.t()) :: Pin.t()
  defp ensure_tags_preloaded(%Pin{tags: %Ecto.Association.NotLoaded{}} = pin),
    do: Repo.preload(pin, :tags)

  defp ensure_tags_preloaded(%Pin{} = pin), do: pin

  @spec resolve_tags_for_update(map(), boolean()) ::
          {:ok, [Storymap.Tags.Tag.t()] | nil} | {:error, Ecto.Changeset.t()}
  defp resolve_tags_for_update(_attrs, false), do: {:ok, nil}

  defp resolve_tags_for_update(attrs, true) do
    Storymap.Tags.get_or_create_tags_by_names(Map.get(attrs, "tags", []))
  end

  @spec pop_field_blobs(map()) :: {[map()], map()}
  defp pop_field_blobs(attrs) when is_map(attrs) do
    {blobs, attrs} = Map.pop(attrs, "field_blobs", [])
    {normalize_field_blobs(blobs), attrs}
  end

  @spec normalize_field_blobs(term()) :: [map()]
  defp normalize_field_blobs(blobs) when is_list(blobs) do
    Enum.map(blobs, fn
      %{} = blob -> stringify_keys(blob)
      _ -> %{}
    end)
  end

  defp normalize_field_blobs(_), do: []

  @spec apply_field_blobs(Pin.t(), [map()]) ::
          Types.ecto_ok(Pin.t()) | Types.ecto_err() | blob_error()
  defp apply_field_blobs(%Pin{} = pin, []), do: {:ok, pin}

  defp apply_field_blobs(%Pin{} = pin, blobs) when is_list(blobs) do
    Enum.reduce_while(blobs, {:ok, pin}, fn blob, {:ok, acc_pin} ->
      field_key = Map.get(blob, "field_key")
      type = parse_blob_type(Map.get(blob, "type"))

      cond do
        not is_binary(field_key) or field_key == "" ->
          {:halt, {:error, blob_attr_error("field_key is required")}}

        type == nil ->
          {:halt, {:error, blob_attr_error("type is invalid")}}

        true ->
          case upsert_field_blob_in_txn(acc_pin, field_key, type, blob) do
            {:ok, %{pin: next_pin}} -> {:cont, {:ok, next_pin}}
            {:error, reason} -> {:halt, {:error, reason}}
          end
      end
    end)
  end

  @spec parse_blob_type(term()) :: PinFieldBlob.blob_type() | nil
  defp parse_blob_type(type) when type in @blob_field_types, do: type

  defp parse_blob_type(type) when is_binary(type) do
    if type in Enum.map(@blob_field_types, &to_string/1) do
      String.to_existing_atom(type)
    else
      nil
    end
  end

  defp parse_blob_type(_), do: nil

  @spec ensure_required_blob_fields(Pin.t(), PinType.t() | nil) ::
          :ok | {:error, Ecto.Changeset.t()}
  defp ensure_required_blob_fields(%Pin{} = pin, %PinType{} = pin_type) do
    missing =
      PinTypeSchema.fields(pin_type.schema)
      |> Enum.filter(&required_blob_field?/1)
      |> Enum.reject(fn field -> blob_row_present?(pin, field) end)
      |> Enum.map(&field_label/1)

    if missing == [] do
      :ok
    else
      {:error,
       %Pin{}
       |> Ecto.Changeset.change()
       |> add_error(:custom_data, "missing required fields: #{Enum.join(missing, ", ")}")}
    end
  end

  defp ensure_required_blob_fields(_pin, _pin_type), do: :ok

  @doc false
  @spec scrub_invalid_blob_refs(Pin.t(), PinType.t() | nil) :: Types.ecto_result(Pin.t())
  defp scrub_invalid_blob_refs(%Pin{} = pin, %PinType{} = pin_type) do
    blob_fields =
      PinTypeSchema.fields(pin_type.schema)
      |> Enum.filter(&BlobFieldType.blob_field?(field_type(&1)))

    custom_data = pin.custom_data || %{}

    cleaned =
      Enum.reduce(blob_fields, custom_data, fn field, data ->
        key = field_key(field)

        cond do
          not is_binary(key) ->
            data

          blob_row_present?(pin, field) ->
            data

          Map.has_key?(data, key) ->
            Map.delete(data, key)

          true ->
            data
        end
      end)

    if cleaned == custom_data do
      {:ok, pin}
    else
      update_pin_fields(pin, %{"custom_data" => cleaned})
    end
  end

  defp scrub_invalid_blob_refs(%Pin{} = pin, _pin_type), do: {:ok, pin}

  defp required_blob_field?(field) do
    required_field?(field) and BlobFieldType.blob_field?(field_type(field))
  end

  defp field_label(field) do
    Map.get(field, "label") || Map.get(field, :label) || field_key(field) || "field"
  end

  @spec blob_row_present?(Pin.t(), map()) :: boolean()
  defp blob_row_present?(%Pin{id: pin_id}, field) when is_integer(pin_id) do
    key = field_key(field)
    type = parse_blob_type(field_type(field))
    is_binary(key) and type != nil and get_field_blob(pin_id, key, type) != nil
  end

  defp blob_row_present?(_pin, _field), do: false

  @spec blob_error_changeset(term()) :: Ecto.Changeset.t()
  defp blob_error_changeset(%Ecto.Changeset{} = changeset), do: changeset

  defp blob_error_changeset(:invalid_blob_field) do
    blob_attr_error("is not a valid blob field for this pin")
  end

  defp blob_error_changeset(:required_blob_field) do
    blob_attr_error("cannot delete required field")
  end

  defp blob_error_changeset(other) when is_atom(other) do
    blob_attr_error(to_string(other))
  end

  defp blob_error_changeset(_), do: blob_attr_error("is invalid")

  defp blob_attr_error(message) do
    %Pin{}
    |> Ecto.Changeset.change()
    |> add_error(:field_blobs, message)
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

  defp maybe_put_privileged_create_fields(changeset, nil, attrs) do
    status = world_create_status(Map.get(attrs, "user_id"))

    changeset
    |> Ecto.Changeset.put_change(:sub_map_id, nil)
    |> Ecto.Changeset.put_change(:status, status)
    |> Ecto.Changeset.put_change(:visible_on_world_map, true)
  end

  defp world_create_status(user_id) when is_integer(user_id) do
    user = Repo.get(User, user_id)

    cond do
      is_nil(user) -> :approved
      TrustPolicy.can_direct_world_post?(user) -> :approved
      Trust.gates_enabled?() -> :pending
      true -> :approved
    end
  end

  defp world_create_status(_), do: :approved

  defp maybe_put_visible_on_world_map(changeset, attrs) do
    case Map.get(attrs, "visible_on_world_map") do
      v when is_boolean(v) -> Ecto.Changeset.put_change(changeset, :visible_on_world_map, v)
      _ -> changeset
    end
  end

  # Owner edit of a rejected pin re-enters the queue (approval_required communities or world).
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

  defp maybe_resubmit_rejected_pin(
         changeset,
         %Pin{status: :rejected, user_id: user_id, sub_map_id: nil},
         nil,
         %User{id: user_id}
       ) do
    Ecto.Changeset.put_change(changeset, :status, :pending)
  end

  defp maybe_resubmit_rejected_pin(changeset, _pin, _sub_map, _user), do: changeset

  @spec maybe_hold_flagged_content(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  defp maybe_hold_flagged_content(changeset) do
    texts = ContentFilter.extract_pin_texts(changeset)

    if ContentFilter.flagged_texts?(texts) do
      changeset
      |> Ecto.Changeset.put_change(:status, :pending)
      |> Ecto.Changeset.put_change(:held_for_moderation, true)
    else
      changeset
    end
  end

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
