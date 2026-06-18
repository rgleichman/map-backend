defmodule StorymapWeb.PinTypeLive.Form do
  @moduledoc false

  @field_types ~w(text textarea number boolean select url list music)

  def field_types, do: @field_types

  def field_type_label("music"), do: "Music"
  def field_type_label(type), do: type

  def build_schema_from_params(%{"fields" => fields}) when is_map(fields) do
    fields
    |> Enum.sort_by(fn {k, _} -> String.to_integer(k) end)
    |> Enum.map(fn {_idx, field} -> normalize_field(field) end)
    |> Enum.reject(&is_nil/1)
    |> then(&%{"fields" => &1})
  end

  def build_schema_from_params(_), do: %{"fields" => []}

  @doc """
  Parses raw form params into field assigns for the UI.
  Unlike `build_schema_from_params/1`, keeps partial fields (key without label, etc.).
  """
  def fields_from_params(%{"fields" => fields}) when is_map(fields) do
    fields
    |> Enum.sort_by(fn {k, _} -> String.to_integer(k) end)
    |> Enum.map(fn {_idx, field} -> field_for_form(field) end)
  end

  def fields_from_params(_), do: nil

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
