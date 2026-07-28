defmodule StorymapWeb.PinJSON do
  @moduledoc """
  JSON rendering for pins. Never includes user_id in any response (privacy / anti-enumeration).
  """
  alias Storymap.Pins.Pin
  alias Storymap.Pins.Authorizer
  alias Storymap.Pins.PinReference
  alias Storymap.PinTypes.PinType
  alias Storymap.SubMaps.SubMap
  alias StorymapWeb.JSON.DateTime, as: JSONDateTime

  # Pin schema fields (no user_id) plus view-only keys: tags, community, is_owner /
  # created_by_me (computed for the authenticated viewer only).
  @pin_data_keys Pin.public_json_fields() ++
                   [:pin_type, :tags, :community, :is_owner, :created_by_me, :linked_pins]

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
  Does not include user_id, is_owner, or created_by_me to prevent user enumeration.
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
    |> put_pin_type_slug(pin)
    |> put_community(pin)
    |> Map.put(:linked_pins, linked_pins_data(pin))
    |> Map.take(@pin_data_keys -- [:is_owner, :created_by_me])
  end

  # Wire `pin_type` is always the catalog slug.
  defp put_pin_type_slug(map, %Pin{pin_type: %PinType{slug: slug}}) do
    Map.put(map, :pin_type, slug)
  end

  defp put_pin_type_slug(map, %Pin{pin_type_id: id}) when is_integer(id) do
    case Storymap.PinTypes.get_pin_type(id) do
      %PinType{slug: slug} -> Map.put(map, :pin_type, slug)
      nil -> Map.put(map, :pin_type, nil)
    end
  end

  defp put_pin_type_slug(map, _pin), do: Map.put(map, :pin_type, nil)

  defp put_community(map, %Pin{sub_map: %SubMap{community_url: url, name: name}}) do
    Map.put(map, :community, %{community_url: url, name: name})
  end

  defp put_community(map, _pin), do: map

  @spec data_with_user(Pin.t(), map(), map()) :: map()
  def data_with_user(%Pin{} = pin, %{} = current_user, assigns \\ %{}) do
    opts = authorizer_opts(assigns)

    is_owner = Authorizer.can_edit_in_json?(current_user, pin, opts)
    created_by_me = pin.user_id == current_user.id

    data(pin)
    |> Map.put(:is_owner, is_owner)
    |> Map.put(:created_by_me, created_by_me)
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
