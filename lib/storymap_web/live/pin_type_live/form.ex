defmodule StorymapWeb.PinTypeLive.Form do
  @moduledoc false

  alias Storymap.PinTypes.Schema

  @field_types ~w(text textarea number boolean select url list music drawing)
  @key_pattern ~r/^[a-z][a-z0-9_]*$/

  @type field_form :: %{
          String.t() => String.t() | boolean()
        }

  @type field_errors :: %{String.t() => [String.t()]}

  @spec field_types() :: [String.t()]
  def field_types, do: @field_types

  @spec field_type_label(String.t()) :: String.t()
  def field_type_label("text"), do: "Text"
  def field_type_label("textarea"), do: "Long text"
  def field_type_label("number"), do: "Number"
  def field_type_label("boolean"), do: "Yes/No"
  def field_type_label("select"), do: "Dropdown"
  def field_type_label("url"), do: "Link"
  def field_type_label("list"), do: "List of text"
  def field_type_label("music"), do: "Music"
  def field_type_label("drawing"), do: "Drawing"
  def field_type_label(type), do: type

  @spec field_type_description(String.t()) :: String.t()
  def field_type_description("text"), do: "Short single-line text."
  def field_type_description("textarea"), do: "Multi-line text for longer notes."
  def field_type_description("number"), do: "Numeric values such as counts or amounts."
  def field_type_description("boolean"), do: "A yes or no toggle."
  def field_type_description("select"), do: "Choose one option from a list you define."
  def field_type_description("url"), do: "A web link."
  def field_type_description("list"), do: "Multiple short text items."
  def field_type_description("music"), do: "Attach or link to music."
  def field_type_description("drawing"), do: "Freehand drawing on the map."
  def field_type_description(_), do: ""

  @spec validate_fields_from_params(map()) ::
          {:ok, Schema.definition()} | {:error, field_errors()}
  def validate_fields_from_params(params) do
    fields =
      case fields_from_params(params) do
        nil -> []
        fields -> assign_field_keys([], fields)
      end

    errors = collect_field_errors(fields)

    if errors == %{} do
      {:ok, build_schema_from_fields(fields)}
    else
      {:error, errors}
    end
  end

  @spec field_errors_from_params(map()) :: field_errors()
  def field_errors_from_params(params) do
    case validate_fields_from_params(params) do
      {:ok, _} -> %{}
      {:error, errors} -> errors
    end
  end

  @spec build_schema_from_params(map()) :: Schema.definition()
  def build_schema_from_params(params) do
    case validate_fields_from_params(params) do
      {:ok, schema} ->
        schema

      {:error, _} ->
        params
        |> fields_from_params()
        |> case do
          nil ->
            %{"fields" => []}

          fields ->
            fields
            |> then(&assign_field_keys([], &1))
            |> build_schema_from_fields()
        end
    end
  end

  @doc """
  Parses raw form params into field assigns for the UI.
  Unlike `build_schema_from_params/1`, keeps partial fields (key without label, etc.).
  """
  @spec fields_from_params(map()) :: [field_form()] | nil
  def fields_from_params(%{"fields" => fields}) when is_map(fields) do
    fields
    |> Enum.sort_by(fn {k, _} -> String.to_integer(k) end)
    |> Enum.map(fn {_idx, field} -> field_for_form(field) end)
  end

  def fields_from_params(_), do: nil

  @spec merge_field_keys([field_form()], [field_form()]) :: [field_form()]
  def merge_field_keys(previous_fields, fields)
      when is_list(previous_fields) and is_list(fields) do
    fields
    |> then(&assign_field_keys(previous_fields, &1))
    |> dedupe_field_keys()
  end

  defp assign_field_keys(previous_fields, fields) do
    fields
    |> Enum.with_index()
    |> Enum.map(fn {field, index} ->
      previous = Enum.at(previous_fields, index)
      key = resolve_field_key(field, previous)
      Map.put(field, "key", key)
    end)
  end

  defp resolve_field_key(field, previous) do
    existing = field["key"] |> to_string() |> String.trim()

    cond do
      existing != "" ->
        existing

      previous && previous["key"] |> to_string() |> String.trim() != "" ->
        String.trim(previous["key"])

      true ->
        derive_key_from_label(field["label"])
    end
  end

  defp derive_key_from_label(label) do
    slug = label |> to_string() |> String.trim() |> slugify_value()

    cond do
      slug == "" -> ""
      Regex.match?(@key_pattern, slug) -> slug
      true -> "field_" <> slug
    end
  end

  defp dedupe_field_keys(fields) do
    fields
    |> Enum.reduce({[], %{}}, fn field, {acc, counts} ->
      base_key = field["key"]

      {new_key, counts} =
        if base_key == "" do
          {"", counts}
        else
          count = Map.get(counts, base_key, 0) + 1
          key = if count == 1, do: base_key, else: "#{base_key}_#{count}"
          {key, Map.put(counts, base_key, count)}
        end

      {[Map.put(field, "key", new_key) | acc], counts}
    end)
    |> elem(0)
    |> Enum.reverse()
  end

  defp collect_field_errors(fields) do
    fields
    |> Enum.with_index()
    |> Enum.reduce(%{}, fn {field, index}, errors ->
      case validate_field_row(field, fields) do
        [] -> errors
        messages -> Map.put(errors, to_string(index), messages)
      end
    end)
  end

  defp validate_field_row(field, all_fields) do
    if row_active?(field) do
      label = field["label"] |> to_string() |> String.trim()
      type = Map.get(field, "type", "text")

      []
      |> maybe_add(label == "", "Enter a label for this field")
      |> maybe_add(
        type == "select" and parse_select_options(field["options"]) == [],
        "Add at least one option (one per line)"
      )
      |> maybe_add(
        label != "" and duplicate_label?(field, all_fields),
        "Another field already uses this label"
      )
    else
      []
    end
  end

  defp row_active?(field) do
    label = field["label"] |> to_string() |> String.trim()
    type = field["type"] || "text"
    required = field["required"] in [true, "true"]
    options = field["options"] |> to_string() |> String.trim()

    label != "" or required or type != "text" or options != ""
  end

  defp duplicate_label?(field, all_fields) do
    label = field["label"] |> to_string() |> String.trim()

    label != "" and
      all_fields
      |> Enum.filter(&row_active?/1)
      |> Enum.count(fn other -> String.trim(other["label"]) == label end) > 1
  end

  defp maybe_add(errors, false, _message), do: errors
  defp maybe_add(errors, true, message), do: errors ++ [message]

  defp build_schema_from_fields(fields) do
    fields
    |> Enum.filter(&row_active?/1)
    |> dedupe_field_keys()
    |> Enum.map(&normalize_field/1)
    |> Enum.reject(&is_nil/1)
    |> then(&%{"fields" => &1})
  end

  defp field_for_form(field) when is_map(field) do
    %{
      "key" => field |> Map.get("key", "") |> to_string(),
      "label" => field |> Map.get("label", "") |> to_string(),
      "type" => Map.get(field, "type", "text") || "text",
      "required" => Map.get(field, "required") in ["true", true, "on", 1],
      "options" => field |> Map.get("options", "") |> to_string()
    }
  end

  defp normalize_field(%{"type" => type} = field) when type in @field_types do
    key = field["key"] |> to_string() |> String.trim()
    label = field["label"] |> to_string() |> String.trim()

    if key == "" or label == "" do
      nil
    else
      base = %{
        "key" => key,
        "label" => label,
        "type" => type,
        "required" => field["required"] in ["true", true, "on", 1]
      }

      case type do
        "select" ->
          Map.put(base, "options", parse_select_options(field["options"]))

        "list" ->
          Map.put(base, "item_type", "text")

        _ ->
          base
      end
    end
  end

  defp normalize_field(_), do: nil

  defp parse_select_options(options) when is_binary(options) do
    options
    |> String.split(["\n", ","], trim: true)
    |> Enum.map(&String.trim/1)
    |> Enum.reject(&(&1 == ""))
    |> Enum.map(&parse_select_option_line/1)
    |> Enum.reject(&is_nil/1)
  end

  defp parse_select_options(_), do: []

  # Supports either:
  # - "Label" (value auto-slugified from label; backwards compatible)
  # - "value | Label" (preserves stable value across edits)
  defp parse_select_option_line(line) when is_binary(line) do
    case String.split(line, "|", parts: 2) do
      [label] ->
        label = String.trim(label)
        if label == "", do: nil, else: %{"value" => slugify_value(label), "label" => label}

      [value, label] ->
        value = String.trim(value)
        label = String.trim(label)

        cond do
          value == "" or label == "" -> nil
          true -> %{"value" => value, "label" => label}
        end
    end
  end

  defp slugify_value(value) do
    value
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9]+/u, "_")
    |> String.trim("_")
  end
end
