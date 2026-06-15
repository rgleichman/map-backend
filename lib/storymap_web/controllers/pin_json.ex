defmodule StorymapWeb.PinJSON do
  @moduledoc """
  JSON rendering for pins. Never includes user_id in any response (privacy / anti-enumeration).
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.Authorizer
  alias Storymap.SubMaps.SubMap

  # Pin schema fields (no user_id) plus view-only keys: tags, community, is_owner (computed).
  @pin_data_keys Pin.public_json_fields() ++ [:tags, :community, :is_owner]

  # Serialize UTC datetime as "YYYY-MM-DDTHH:mm:ss" (no Z) so the wire format signals "local".
  defp datetime_to_iso_local(%DateTime{} = dt) do
    pad = fn n -> String.pad_leading(Integer.to_string(n), 2, "0") end

    "#{dt.year}-#{pad.(dt.month)}-#{pad.(dt.day)}T#{pad.(dt.hour)}:#{pad.(dt.minute)}:#{pad.(dt.second)}"
  end

  def index(%{pins: pins, current_user: %{} = current_user} = assigns) do
    %{data: for(pin <- pins, do: data_with_user(pin, current_user, assigns))}
  end

  def index(%{pins: pins}) do
    %{data: for(pin <- pins, do: data(pin))}
  end

  def show(%{pin: pin, current_user: %{} = current_user} = assigns) do
    %{data: data_with_user(pin, current_user, assigns)}
  end

  def show(%{pin: pin}) do
    %{data: data(pin)}
  end

  @doc """
  Renders pin data for public (unauthenticated) responses.
  Does not include user_id or is_owner to prevent user enumeration.
  """
  def data(%Pin{} = pin) do
    base =
      Pin.public_json_fields()
      |> Enum.map(fn
        :start_time -> {:start_time, pin.start_time && datetime_to_iso_local(pin.start_time)}
        :end_time -> {:end_time, pin.end_time && datetime_to_iso_local(pin.end_time)}
        key -> {key, Map.get(pin, key)}
      end)
      |> Map.new()
      |> Map.put(:tags, (pin.tags || []) |> Enum.map(& &1.name))
      |> put_community(pin)

    Map.take(base, @pin_data_keys -- [:is_owner])
  end

  defp put_community(map, %Pin{sub_map: %SubMap{community_url: url, name: name}}) do
    Map.put(map, :community, %{community_url: url, name: name})
  end

  defp put_community(map, _pin), do: map

  def data_with_user(%Pin{} = pin, %{} = current_user, assigns \\ %{}) do
    opts = authorizer_opts(assigns)

    is_owner = Authorizer.can_edit_in_json?(current_user, pin, opts)

    data(pin)
    |> Map.put(:is_owner, is_owner)
    |> Map.take(@pin_data_keys)
  end

  defp authorizer_opts(assigns) do
    [
      sub_map: Map.get(assigns, :sub_map),
      membership: Map.get(assigns, :membership)
    ]
  end
end
