defmodule Storymap.PinTypes.Schema do
  @moduledoc false

  @field_types ~w(text textarea number boolean select url list music drawing)
  @max_fields 30
  @max_key_length 64
  @max_label_length 120
  @max_options 50

  @type field_type :: String.t()

  @type select_option :: map()

  @type field_definition :: map()

  @type definition :: map()

  @type validation_result :: :ok | {:error, String.t()}

  @spec validate_definition(map()) :: validation_result()
  def validate_definition(%{"fields" => fields}) when is_list(fields),
    do: validate_fields(fields)

  def validate_definition(%{fields: fields}) when is_list(fields), do: validate_fields(fields)

  def validate_definition(_), do: {:error, "must include a fields array"}

  @spec fields(map()) :: [field_definition()]
  def fields(%{"fields" => fields}) when is_list(fields), do: fields
  def fields(%{fields: fields}) when is_list(fields), do: fields
  def fields(_), do: []

  defp validate_fields(fields) when length(fields) > @max_fields,
    do: {:error, "at most #{@max_fields} fields allowed"}

  defp validate_fields(fields) do
    keys = Enum.map(fields, &field_key/1)

    cond do
      Enum.any?(keys, &is_nil/1) ->
        {:error, "each field must have a key"}

      length(Enum.uniq(keys)) != length(keys) ->
        {:error, "field keys must be unique"}

      true ->
        case Enum.find_index(fields, &(validate_field(&1) != :ok)) do
          nil ->
            :ok

          idx ->
            field = Enum.at(fields, idx)
            {:error, field_error_message(field, idx)}
        end
    end
  end

  defp field_error_message(field, idx) do
    key = field_key(field)
    type = get(field, "type")
    label = get(field, "label")

    cond do
      is_nil(key) ->
        "Field #{idx + 1} is missing an internal key"

      not is_binary(label) or label == "" ->
        "Field #{idx + 1} needs a label"

      type == "select" and not valid_select_options?(field) ->
        "Field #{idx + 1} needs at least one dropdown option"

      true ->
        "Field #{idx + 1} is invalid"
    end
  end

  defp field_key(%{"key" => key}) when is_binary(key), do: key
  defp field_key(%{key: key}) when is_binary(key), do: key
  defp field_key(_), do: nil

  defp validate_field(field) do
    key = field_key(field)
    type = get(field, "type")
    label = get(field, "label")

    cond do
      not is_binary(key) or String.length(key) > @max_key_length or not valid_key?(key) ->
        {:error, "Field key is invalid"}

      type not in @field_types ->
        {:error, "Field type is invalid"}

      not is_binary(label) or String.length(label) > @max_label_length ->
        {:error, "Field label is invalid"}

      type == "select" and not valid_select_options?(field) ->
        {:error, "Select fields need at least one option"}

      type == "list" and get(field, "item_type") not in [nil, "text"] ->
        {:error, "List fields must use text items"}

      true ->
        :ok
    end
  end

  defp valid_key?(key), do: Regex.match?(~r/^[a-z][a-z0-9_]*$/, key)

  defp valid_select_options?(field) do
    options = get(field, "options") || []

    is_list(options) and length(options) <= @max_options and
      Enum.all?(options, fn
        %{"value" => v, "label" => l} when is_binary(v) and is_binary(l) -> true
        %{value: v, label: l} when is_binary(v) and is_binary(l) -> true
        _ -> false
      end)
  end

  defp get(map, key) when is_map(map) do
    Map.get(map, key) || Map.get(map, String.to_existing_atom(key))
  rescue
    ArgumentError -> Map.get(map, key)
  end
end
