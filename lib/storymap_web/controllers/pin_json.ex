defmodule StorymapWeb.PinJSON do
  @moduledoc """
  JSON rendering for pins. Never includes user_id in any response (privacy / anti-enumeration).
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.Authorizer
  alias Storymap.Pins.PinReference
  alias Storymap.SubMaps.SubMap
  alias StorymapWeb.JSON.DateTime, as: JSONDateTime

  # Pin schema fields (no user_id) plus view-only keys: tags, community, is_owner (computed).
  @pin_data_keys Pin.public_json_fields() ++ [:tags, :community, :is_owner, :linked_pins]

  @spec index(map()) :: map()
  def index(%{pins: pins, current_user: %{} = current_user} = assigns) do
    %{data: for(pin <- pins, do: data_with_user(pin, current_user, assigns))}
  end

  def index(%{pins: pins}) do
    %{data: for(pin <- pins, do: data(pin))}
  end

  @spec show(map()) :: map()
  def show(%{pin: pin, current_user: %{} = current_user} = assigns) do
    %{data: data_with_user(pin, current_user, assigns)}
  end

  def show(%{pin: pin}) do
    %{data: data(pin)}
  end

  @spec backlinks(map()) :: map()
  def backlinks(%{backlinks: backlinks}) do
    %{data: Enum.map(backlinks, &backlink_data/1)}
  end

  @doc """
  Renders pin data for public (unauthenticated) responses.
  Does not include user_id or is_owner to prevent user enumeration.
  """
  @spec data(Pin.t()) :: map()
  def data(%Pin{} = pin) do
    Pin.public_json_fields()
    |> Enum.map(fn
      :start_time -> {:start_time, pin.start_time && JSONDateTime.to_iso_local(pin.start_time)}
      :end_time -> {:end_time, pin.end_time && JSONDateTime.to_iso_local(pin.end_time)}
      :status -> {:status, to_string(pin.status)}
      key -> {key, Map.get(pin, key)}
    end)
    |> Map.new()
    |> Map.put(:tags, (pin.tags || []) |> Enum.map(& &1.name))
    |> put_community(pin)
    |> Map.put(:linked_pins, linked_pins_data(pin))
    |> Map.take(@pin_data_keys -- [:is_owner])
  end

  defp put_community(map, %Pin{sub_map: %SubMap{community_url: url, name: name}}) do
    Map.put(map, :community, %{community_url: url, name: name})
  end

  defp put_community(map, _pin), do: map

  @spec data_with_user(Pin.t(), map(), map()) :: map()
  def data_with_user(%Pin{} = pin, %{} = current_user, assigns \\ %{}) do
    opts = authorizer_opts(assigns)

    is_owner = Authorizer.can_edit_in_json?(current_user, pin, opts)

    data(pin)
    |> Map.put(:is_owner, is_owner)
    |> Map.take(@pin_data_keys)
  end

  defp pin_link_data(%PinReference{target_pin_id: target_id, source_field: field}) do
    %{
      pin_id: target_id,
      source_field: field
    }
  end

  defp backlink_data(%PinReference{source_pin_id: source_id, source_field: field}) do
    %{
      pin_id: source_id,
      source_field: field
    }
  end

  defp linked_pins_data(%Pin{outgoing_references: refs}) when is_list(refs) do
    refs
    |> Enum.sort_by(fn
      %{kind: :explicit, position: pos} when is_integer(pos) -> {0, pos}
      _ -> {1, 0}
    end)
    |> Enum.map(&pin_link_data/1)
  end

  defp linked_pins_data(_), do: []

  defp authorizer_opts(assigns) do
    [
      sub_map: Map.get(assigns, :sub_map),
      membership: Map.get(assigns, :membership)
    ]
  end
end
