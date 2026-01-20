defmodule StorymapWeb.PinJSON do
  alias Storymap.Pins.Pin

  @doc """
  Renders a list of pins.
  Includes user_id only if current_user_id is provided (authenticated user).
  """
  def index(%{pins: pins, current_user_id: current_user_id}) when not is_nil(current_user_id) do
    %{data: for(pin <- pins, do: data_with_user(pin))}
  end

  def index(%{pins: pins}) do
    %{data: for(pin <- pins, do: data(pin))}
  end

  @doc """
  Renders a single pin.
  Includes user_id only if current_user_id is provided (authenticated user).
  """
  def show(%{pin: pin, current_user_id: current_user_id}) when not is_nil(current_user_id) do
    %{data: data_with_user(pin)}
  end

  def show(%{pin: pin}) do
    %{data: data(pin)}
  end

  @doc """
  Renders pin data for public (unauthenticated) responses.
  Does not include user_id to prevent user enumeration.
  """
  def data(%Pin{} = pin) do
    %{
      id: pin.id,
      title: pin.title,
      latitude: pin.latitude,
      longitude: pin.longitude,
      description: pin.description,
      icon_url: pin.icon_url,
      tags: Enum.map(pin.tags || [], & &1.name)
    }
  end

  @doc """
  Renders pin data for authenticated responses.
  Includes user_id for authenticated users viewing their own pins.
  """
  def data_with_user(%Pin{} = pin) do
    data(pin)
    |> Map.put(:user_id, pin.user_id)
  end
end
