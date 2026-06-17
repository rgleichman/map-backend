defmodule StorymapWeb.SubMapLive.PinTypeForm do
  @moduledoc false

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType
  alias Storymap.SubMaps.PinTypeSettings

  def assign_pin_types(socket, settings) do
    socket
    |> Phoenix.Component.assign(:pin_type_settings, PinTypeSettings.normalize_settings(settings))
    |> Phoenix.Component.assign(:custom_pin_types, PinTypes.list_enabled_pin_types())
    |> Phoenix.Component.assign(:builtin_pin_types, CustomPinType.builtin_pin_types())
  end

  def attrs_from(params) when is_map(params) do
    %{
      "enabled_builtin_pin_types" => selected_list(params, "enabled_builtin_pin_types"),
      "enabled_custom_pin_types" => selected_list(params, "enabled_custom_pin_types")
    }
  end

  defp selected_list(params, key) do
    params
    |> Map.get(key, [])
    |> List.wrap()
  end
end
