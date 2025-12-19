defmodule StorymapWeb.PinController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.Pin

  action_fallback StorymapWeb.FallbackController

  def index(conn, _params) do
    pins = Pins.list_pins()
    render(conn, :index, pins: pins)
  end

  def create(conn, %{"pin" => pin_params}) do
    user_id = conn.assigns.current_scope.user.id
    pin_result = Pins.create_pin(pin_params, user_id)

    with {:ok, %Pin{} = pin} <- pin_result do
      pin = Storymap.Repo.preload(pin, :tags)
      StorymapWeb.Endpoint.broadcast(
        "map:world",
        "marker_added", %{
          pin: StorymapWeb.PinJSON.data(pin)
        })
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/pins/#{pin}")
      |> render(:show, pin: pin)
    end
  end

  def show(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    render(conn, :show, pin: pin)
  end

  def update(conn, %{"id" => id, "pin" => pin_params}) do
    pin = Pins.get_pin!(id)

    with {:ok, %Pin{} = pin} <- Pins.update_pin(pin, pin_params) do
      pin = Storymap.Repo.preload(pin, :tags)
      render(conn, :show, pin: pin)
    end
  end

  def delete(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)

    with {:ok, %Pin{}} <- Pins.delete_pin(pin) do
      send_resp(conn, :no_content, "")
    end
  end
end
