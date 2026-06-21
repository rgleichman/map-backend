defmodule Storymap.PinTypes.Validator do
  @moduledoc false

  import Ecto.Changeset

  alias Storymap.Pins.BlobFieldType
  alias Storymap.PinTypes.{CustomPinType, Schema}
  alias Storymap.URL

  @max_json_bytes 16_384
  @max_string_length 2000
  @max_list_items 50

  @spec validate_custom_data(Ecto.Changeset.t(), CustomPinType.t() | nil) :: Ecto.Changeset.t()
  def validate_custom_data(changeset, %CustomPinType{} = pin_type) do
    data = get_field(changeset, :custom_data) || %{}
    fields = Schema.fields(pin_type.schema)

    with :ok <- check_json_size(data),
         :ok <- validate_required_fields(data, fields),
         :ok <- validate_field_values(data, fields) do
      put_change(changeset, :custom_data, sanitize_data(data, fields))
    else
      {:error, message} -> add_error(changeset, :custom_data, message)
    end
  end

  def validate_custom_data(changeset, nil) do
    add_error(changeset, :pin_type, "references an unknown custom pin type")
  end

  defp check_json_size(data) do
    case :erlang.term_to_binary(data) |> byte_size() do
      size when size <= @max_json_bytes -> :ok
      _ -> {:error, "is too large"}
    end
  end

  defp validate_required_fields(data, fields) do
    missing =
      fields
      |> Enum.filter(&required?/1)
      |> Enum.reject(&blob_field?/1)
      |> Enum.reject(fn field -> present?(data, field_key(field)) end)
      |> Enum.map(&field_label/1)

    if missing == [] do
      :ok
    else
      {:error, "missing required fields: #{Enum.join(missing, ", ")}"}
    end
  end

  defp validate_field_values(data, fields) do
    Enum.reduce_while(fields, :ok, fn field, _acc ->
      key = field_key(field)

      case Map.fetch(data, key) do
        :error ->
          {:cont, :ok}

        {:ok, value} ->
          case validate_value(value, field) do
            :ok -> {:cont, :ok}
            {:error, message} -> {:halt, {:error, "#{field_label(field)} #{message}"}}
          end
      end
    end)
  end

  defp sanitize_data(data, fields) do
    allowed = Map.new(fields, fn field -> {field_key(field), true} end)

    data
    |> Enum.filter(fn {k, _} -> Map.has_key?(allowed, k) end)
    |> Map.new()
  end

  defp validate_value(value, %{"type" => "text"}), do: validate_string(value)
  defp validate_value(value, %{type: "text"}), do: validate_string(value)

  defp validate_value(value, %{"type" => "textarea"}), do: validate_string(value)
  defp validate_value(value, %{type: "textarea"}), do: validate_string(value)

  defp validate_value(value, %{"type" => "url"}), do: validate_url(value)
  defp validate_value(value, %{type: "url"}), do: validate_url(value)

  defp validate_value(value, %{"type" => "number"}), do: validate_number_value(value)
  defp validate_value(value, %{type: "number"}), do: validate_number_value(value)

  defp validate_value(value, %{"type" => "boolean"}) when is_boolean(value), do: :ok
  defp validate_value(value, %{type: "boolean"}) when is_boolean(value), do: :ok

  defp validate_value(_value, %{"type" => "boolean"}), do: {:error, "must be true or false"}
  defp validate_value(_value, %{type: "boolean"}), do: {:error, "must be true or false"}

  defp validate_value(value, field = %{"type" => "select"}), do: validate_select(value, field)
  defp validate_value(value, field = %{type: "select"}), do: validate_select(value, field)

  defp validate_value(value, %{"type" => "list"}), do: validate_list(value)
  defp validate_value(value, %{type: "list"}), do: validate_list(value)

  defp validate_value(value, %{"type" => "music"}), do: validate_blob_ref(value)
  defp validate_value(value, %{type: "music"}), do: validate_blob_ref(value)

  defp validate_value(value, %{"type" => "drawing"}), do: validate_blob_ref(value)
  defp validate_value(value, %{type: "drawing"}), do: validate_blob_ref(value)

  defp validate_value(_, _), do: {:error, "has invalid type"}

  defp validate_string(value) when is_binary(value) do
    if String.length(value) <= @max_string_length do
      :ok
    else
      {:error, "is too long"}
    end
  end

  defp validate_string(_), do: {:error, "must be text"}

  defp validate_url(value) when is_binary(value) do
    sanitized = URL.sanitize_link_input(value)

    if String.length(sanitized) <= @max_string_length and URL.safe_url?(sanitized) do
      :ok
    else
      {:error, "must be a valid link (http(s), mailto, domain, or email)"}
    end
  end

  defp validate_url(_), do: {:error, "must be a valid link (http(s), mailto, domain, or email)"}

  defp validate_number_value(value) when is_integer(value) or is_float(value), do: :ok
  defp validate_number_value(_), do: {:error, "must be a number"}

  defp validate_select(value, field) when is_binary(value) do
    allowed =
      (get(field, "options") || [])
      |> Enum.map(fn
        %{"value" => v} -> v
        %{value: v} -> v
      end)

    if value in allowed do
      :ok
    else
      {:error, "is not a valid option"}
    end
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

  defp validate_blob_ref(_),
    do: {:error, "must be a reference (integer id or %{ref: id})"}

  defp required?(%{"required" => true}), do: true
  defp required?(%{required: true}), do: true
  defp required?(_), do: false

  defp blob_field?(%{"type" => type}), do: BlobFieldType.blob_field?(type)
  defp blob_field?(%{type: type}), do: BlobFieldType.blob_field?(type)
  defp blob_field?(_), do: false

  defp present?(data, key) do
    case Map.get(data, key) do
      nil -> false
      "" -> false
      [] -> false
      _ -> true
    end
  end

  defp field_key(%{"key" => key}), do: key
  defp field_key(%{key: key}), do: key

  defp field_label(%{"label" => label}), do: label
  defp field_label(%{label: label}), do: label
  defp field_label(%{"key" => key}), do: key
  defp field_label(%{key: key}), do: key

  defp get(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_existing_atom(key))
  rescue
    ArgumentError -> Map.get(map, key)
  end
end
