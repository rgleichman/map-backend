defmodule Storymap.Pins.AdHocFields do
  @moduledoc """
  Per-pin extra fields stored in `pins.ad_hoc_fields` (not type schema / `custom_data`).

  Each entry is an ordered map:
  `%{"id" => ..., "label" => ..., "type" => ..., "options" => ..., "value" => ...}`
  """

  import Ecto.Changeset

  alias Storymap.Pins.BlobFieldType
  alias Storymap.PinTypes.FieldType
  alias Storymap.URL

  @max_fields 30
  @max_json_bytes 16_384
  @max_string_length 2000
  @max_list_items 50
  @id_pattern ~r/^[a-z][a-z0-9_]{0,47}$/

  @type field :: %{optional(String.t()) => term()}

  @spec validate(Ecto.Changeset.t()) :: Ecto.Changeset.t()
  def validate(changeset) do
    fields = get_field(changeset, :ad_hoc_fields) || []

    with :ok <- check_list(fields),
         :ok <- check_json_size(fields),
         :ok <- validate_entries(fields) do
      put_change(changeset, :ad_hoc_fields, sanitize(fields))
    else
      {:error, message} -> add_error(changeset, :ad_hoc_fields, message)
    end
  end

  @spec put_blob_ref([field()], String.t(), integer()) :: [field()]
  def put_blob_ref(fields, field_id, blob_id)
      when is_list(fields) and is_binary(field_id) and is_integer(blob_id) do
    Enum.map(fields, fn
      %{"id" => ^field_id} = field -> Map.put(field, "value", %{"ref" => blob_id})
      other -> other
    end)
  end

  @spec clear_blob_ref([field()], String.t()) :: [field()]
  def clear_blob_ref(fields, field_id) when is_list(fields) and is_binary(field_id) do
    Enum.map(fields, fn
      %{"id" => ^field_id} = field -> Map.delete(field, "value")
      other -> other
    end)
  end

  @spec find_field([field()], String.t()) :: field() | nil
  def find_field(fields, field_id) when is_list(fields) and is_binary(field_id) do
    Enum.find(fields, fn
      %{"id" => ^field_id} -> true
      _ -> false
    end)
  end

  defp check_list(fields) when is_list(fields) do
    if length(fields) <= @max_fields do
      :ok
    else
      {:error, "has too many fields (max #{@max_fields})"}
    end
  end

  defp check_list(_), do: {:error, "must be a list"}

  defp check_json_size(fields) do
    case :erlang.term_to_binary(fields) |> byte_size() do
      size when size <= @max_json_bytes -> :ok
      _ -> {:error, "is too large"}
    end
  end

  defp validate_entries(fields) do
    ids = Enum.map(fields, &field_id/1)

    cond do
      Enum.any?(ids, &is_nil/1) ->
        {:error, "each field must have an id"}

      length(Enum.uniq(ids)) != length(ids) ->
        {:error, "field ids must be unique"}

      true ->
        Enum.reduce_while(fields, :ok, fn field, _ ->
          case validate_entry(field) do
            :ok -> {:cont, :ok}
            {:error, message} -> {:halt, {:error, message}}
          end
        end)
    end
  end

  defp validate_entry(field) when is_map(field) do
    id = field_id(field)
    label = field_label(field)
    type = field_type(field)

    cond do
      not valid_id?(id) ->
        {:error, "field id is invalid"}

      not is_binary(label) or String.trim(label) == "" ->
        {:error, "field label can't be blank"}

      String.length(label) > 120 ->
        {:error, "field label is too long"}

      type not in FieldType.values() ->
        {:error, "field type is invalid"}

      type == "select" and not valid_select_options?(field) ->
        {:error, "select fields need options"}

      true ->
        validate_value(Map.get(field, "value") || Map.get(field, :value), type, field)
    end
  end

  defp validate_entry(_), do: {:error, "each field must be an object"}

  defp validate_value(nil, _type, _field), do: :ok
  defp validate_value("", type, _field) when type in ~w(text textarea url select), do: :ok
  defp validate_value([], "list", _field), do: :ok

  defp validate_value(value, "text", _), do: validate_string(value)
  defp validate_value(value, "textarea", _), do: validate_string(value)
  defp validate_value(value, "url", _), do: validate_url(value)
  defp validate_value(value, "number", _), do: validate_number_value(value)
  defp validate_value(value, "boolean", _) when is_boolean(value), do: :ok
  defp validate_value(_, "boolean", _), do: {:error, "boolean value must be true or false"}
  defp validate_value(value, "select", field), do: validate_select(value, field)
  defp validate_value(value, "list", _), do: validate_list(value)

  defp validate_value(value, type, _) when type in ["music", "drawing"],
    do: validate_blob_ref(value)

  defp validate_value(_, _, _), do: {:error, "has invalid value"}

  defp sanitize(fields) when is_list(fields) do
    Enum.map(fields, fn field ->
      field
      |> stringify_keys()
      |> Map.take(["id", "label", "type", "options", "value", "item_type"])
      |> then(fn f ->
        if f["type"] == "select", do: f, else: Map.delete(f, "options")
      end)
    end)
  end

  defp stringify_keys(map) when is_map(map) do
    Map.new(map, fn
      {k, v} when is_atom(k) -> {to_string(k), v}
      {k, v} -> {k, v}
    end)
  end

  defp valid_id?(id) when is_binary(id), do: Regex.match?(@id_pattern, id)
  defp valid_id?(_), do: false

  defp valid_select_options?(field) do
    options = Map.get(field, "options") || Map.get(field, :options) || []

    is_list(options) and options != [] and
      Enum.all?(options, fn
        %{"value" => v, "label" => l} when is_binary(v) and is_binary(l) -> true
        %{value: v, label: l} when is_binary(v) and is_binary(l) -> true
        _ -> false
      end)
  end

  defp validate_string(value) when is_binary(value) do
    if String.length(value) <= @max_string_length, do: :ok, else: {:error, "is too long"}
  end

  defp validate_string(_), do: {:error, "must be text"}

  defp validate_url(value) when is_binary(value) do
    sanitized = URL.sanitize_link_input(value)

    if String.length(sanitized) <= @max_string_length and URL.safe_url?(sanitized) do
      :ok
    else
      {:error, "must be a valid link"}
    end
  end

  defp validate_url(_), do: {:error, "must be a valid link"}

  defp validate_number_value(value) when is_integer(value) or is_float(value), do: :ok
  defp validate_number_value(_), do: {:error, "must be a number"}

  defp validate_select(value, field) when is_binary(value) do
    allowed =
      (Map.get(field, "options") || Map.get(field, :options) || [])
      |> Enum.map(fn
        %{"value" => v} -> v
        %{value: v} -> v
      end)

    if value in allowed, do: :ok, else: {:error, "is not a valid option"}
  end

  defp validate_select(_, _), do: {:error, "must be a valid option"}

  defp validate_list(value) when is_list(value) do
    cond do
      length(value) > @max_list_items -> {:error, "has too many items"}
      Enum.all?(value, &is_binary/1) -> :ok
      true -> {:error, "must be a list of text items"}
    end
  end

  defp validate_list(_), do: {:error, "must be a list"}

  defp validate_blob_ref(value) when is_integer(value) and value > 0, do: :ok
  defp validate_blob_ref(%{"ref" => ref}) when is_integer(ref) and ref > 0, do: :ok
  defp validate_blob_ref(%{ref: ref}) when is_integer(ref) and ref > 0, do: :ok
  defp validate_blob_ref(_), do: {:error, "must be a reference"}

  defp field_id(%{"id" => id}), do: id
  defp field_id(%{id: id}), do: id
  defp field_id(_), do: nil

  defp field_label(%{"label" => label}), do: label
  defp field_label(%{label: label}), do: label
  defp field_label(_), do: nil

  defp field_type(%{"type" => type}), do: type
  defp field_type(%{type: type}), do: type
  defp field_type(_), do: nil

  @doc false
  def blob_field_type?(type), do: BlobFieldType.blob_field?(type)
end
