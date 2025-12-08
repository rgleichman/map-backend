defmodule StorymapWeb.PinJSON do
  alias Storymap.Pins.Pin

  @doc """
  Renders a list of pins.
  """
  def index(%{pins: pins}) do
    %{data: for(pin <- pins, do: data(pin))}
  end

  @doc """
  Renders a single pin.
  """
  def show(%{pin: pin}) do
    %{data: data(pin)}
  end

  defp data(%Pin{} = pin) do
    %{
      id: pin.id,
      title: pin.title,
      latitude: pin.latitude,
      longitude: pin.longitude,
      description: pin.description,
      icon_url: pin.icon_url,
      user_id: pin.user_id
    }
  end
end
