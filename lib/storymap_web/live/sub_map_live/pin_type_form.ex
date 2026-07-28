defmodule StorymapWeb.SubMapLive.PinTypeForm do
  @moduledoc false

  alias Storymap.PinTypes
  alias Storymap.SubMaps.PinTypeSettings
  alias Storymap.SubMaps.SubMap

  def assign_pin_types(socket, %SubMap{} = sub_map) do
    socket
    |> Phoenix.Component.assign(:pin_types, PinTypes.list_enabled_pin_types())
    |> Phoenix.Component.assign(
      :enabled_pin_type_ids,
      PinTypeSettings.enabled_pin_type_ids(sub_map)
    )
  end

  def assign_pin_types(socket, _sub_map) do
    socket
    |> Phoenix.Component.assign(:pin_types, PinTypes.list_enabled_pin_types())
    |> Phoenix.Component.assign(:enabled_pin_type_ids, [])
  end

  def attrs_from(params) when is_map(params) do
    %{"enabled_pin_type_ids" => params |> Map.get("enabled_pin_type_ids", []) |> List.wrap()}
  end
end
