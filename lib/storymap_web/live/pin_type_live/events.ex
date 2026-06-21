defmodule StorymapWeb.PinTypeLive.Events do
  @moduledoc false

  import Ecto.Changeset

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType
  alias StorymapWeb.PinTypeLive.Form

  def assign_field_errors(socket, field_errors) do
    Phoenix.Component.assign(socket, :field_errors, field_errors)
  end

  def sync_fields(socket, params) do
    prior = socket.assigns.fields

    case Form.fields_from_params(params) do
      nil ->
        socket

      fields ->
        socket
        |> Phoenix.Component.assign(:fields, Form.merge_field_keys(fields, prior))
    end
  end

  def attrs_from_params(params) do
    schema = Form.build_schema_from_params(params)

    params
    |> Map.take(["label", "description", "marker_color", "icon", "slug", "enabled"])
    |> Map.put("schema", schema)
    |> maybe_put_enabled()
  end

  def validate_params(params) do
    case Form.validate_fields_from_params(params) do
      {:ok, _} -> {:ok, attrs_from_params(params)}
      {:error, field_errors} -> {:error, field_errors}
    end
  end

  def changeset_with_field_errors(changeset, field_errors) do
    if map_size(field_errors) == 0 do
      changeset
    else
      changeset
      |> Map.put(:action, :validate)
      |> add_error(:schema, "Fix the field errors below")
    end
  end

  def change_pin_type(%CustomPinType{} = pin_type, attrs) do
    PinTypes.change_pin_type(pin_type, attrs)
  end

  def move_field(fields, index, direction) when direction in [:up, :down] do
    idx = if is_binary(index), do: String.to_integer(index), else: index
    target = if direction == :up, do: idx - 1, else: idx + 1

    if target >= 0 and target < length(fields) do
      a = Enum.at(fields, idx)
      b = Enum.at(fields, target)
      fields |> List.replace_at(idx, b) |> List.replace_at(target, a)
    else
      fields
    end
  end

  def empty_field do
    %{"key" => "", "label" => "", "type" => "text", "required" => false, "options" => ""}
  end

  def default_marker_color(nil), do: "#6366f1"
  def default_marker_color(""), do: "#6366f1"
  def default_marker_color(color), do: color

  defp maybe_put_enabled(attrs) do
    case Map.get(attrs, "enabled") do
      "true" -> Map.put(attrs, "enabled", true)
      "false" -> Map.put(attrs, "enabled", false)
      _ -> Map.delete(attrs, "enabled")
    end
  end
end
