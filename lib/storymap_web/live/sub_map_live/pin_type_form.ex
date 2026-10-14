defmodule StorymapWeb.SubMapLive.PinTypeForm do
  @moduledoc false

  alias Storymap.PinTypes
  alias Storymap.SubMaps.PinTypeSettings
  alias Storymap.SubMaps.SubMap

  @spec assign_pin_types(Phoenix.LiveView.Socket.t(), SubMap.t() | nil) ::
          Phoenix.LiveView.Socket.t()
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

  @doc """
  Syncs checked pin type ids from form params so `phx-change` does not
  re-render checkboxes from the previous assign and silently discard edits.
  """
  @spec sync_enabled_ids(Phoenix.LiveView.Socket.t(), map()) :: Phoenix.LiveView.Socket.t()
  def sync_enabled_ids(socket, params) when is_map(params) do
    Phoenix.Component.assign(socket, :enabled_pin_type_ids, enabled_ids_from(params))
  end

  @spec attrs_from(map()) :: %{String.t() => [integer()]}
  def attrs_from(params) when is_map(params) do
    %{"enabled_pin_type_ids" => enabled_ids_from(params)}
  end

  @spec enabled_ids_from(map()) :: [integer()]
  def enabled_ids_from(params) when is_map(params) do
    params
    |> Map.get("enabled_pin_type_ids", [])
    |> List.wrap()
    |> Enum.map(&normalize_id/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.uniq()
  end

  defp normalize_id(id) when is_integer(id), do: id

  defp normalize_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {int, ""} -> int
      _ -> nil
    end
  end

  defp normalize_id(_), do: nil
end
