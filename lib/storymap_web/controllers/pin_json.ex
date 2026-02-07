defmodule StorymapWeb.PinJSON do
  @moduledoc """
  JSON rendering for pins. Never includes user_id in any response (privacy / anti-enumeration).
  """
  alias Storymap.Pins.Pin

  # Pin schema fields (no user_id) plus view-only keys: tags (from association), is_owner (computed).
  @pin_data_keys Pin.public_json_fields() ++ [:tags, :is_owner]

  @doc """
  Renders a list of pins.
  Includes is_owner flag only if current_user_id is provided (authenticated user).
  """
  def index(%{pins: pins, current_user_id: current_user_id}) when not is_nil(current_user_id) do
    %{data: for(pin <- pins, do: data_with_user(pin, current_user_id))}
  end

  def index(%{pins: pins}) do
    %{data: for(pin <- pins, do: data(pin))}
  end

  @doc """
  Renders a single pin.
  Includes is_owner flag only if current_user_id is provided (authenticated user).
  """
  def show(%{pin: pin, current_user_id: current_user_id}) when not is_nil(current_user_id) do
    %{data: data_with_user(pin, current_user_id)}
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
        :start_time -> {:start_time, pin.start_time && DateTime.to_iso8601(pin.start_time)}
        :end_time -> {:end_time, pin.end_time && DateTime.to_iso8601(pin.end_time)}
        key -> {key, Map.get(pin, key)}
      end)
      |> Map.new()
      |> Map.put(:tags, (pin.tags || []) |> Enum.map(& &1.name))

    Map.take(base, @pin_data_keys -- [:is_owner])
  end

  @doc """
  Renders pin data for authenticated responses.
  Computes is_owner flag based on whether pin belongs to current user.
  Never includes user_id to prevent user enumeration.
  """
  def data_with_user(%Pin{} = pin, current_user_id) do
    data(pin)
    |> Map.put(:is_owner, pin.user_id == current_user_id)
    |> Map.take(@pin_data_keys)
  end
end
