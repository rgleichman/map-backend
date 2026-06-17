defmodule Storymap.PinTypes.Schema do
  @moduledoc false

  @field_types ~w(text textarea number boolean select url list)
  @max_fields 30
  @max_key_length 64
  @max_label_length 120
  @max_options 50

  def validate_definition(%{"fields" => fields}) when is_list(fields),
    do: validate_fields(fields)

  def validate_definition(%{fields: fields}) when is_list(fields), do: validate_fields(fields)

  def validate_definition(_), do: {:error, "must include a fields array"}

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
          nil -> :ok
          idx -> {:error, "invalid field at index #{idx}"}
        end
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
        :error

      type not in @field_types ->
        :error

      not is_binary(label) or String.length(label) > @max_label_length ->
        :error

      type == "select" and not valid_select_options?(field) ->
        :error

      type == "list" and get(field, "item_type") not in [nil, "text"] ->
        :error

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
