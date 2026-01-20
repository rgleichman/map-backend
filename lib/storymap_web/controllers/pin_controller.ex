defmodule StorymapWeb.PinController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.Pin

  action_fallback StorymapWeb.FallbackController

  def index(conn, _params) do
    pins = Pins.list_pins()
    # Only include user_id if user is authenticated (prevents user enumeration for unauthenticated users)
    render(conn, :index, pins: pins, current_user_id: get_current_user_id(conn))
  end

  defp get_current_user_id(conn) do
    case conn.assigns[:current_scope] do
      %{user: %{id: user_id}} -> user_id
      _ -> nil
    end
  end

  def create(conn, %{"pin" => pin_params}) do
    user_id = conn.assigns.current_scope.user.id
    pin_result = Pins.create_pin(pin_params, user_id)

    with {:ok, %Pin{} = pin} <- pin_result do
      pin = Storymap.Repo.preload(pin, :tags)
      # Include user_id in broadcast so creator can immediately edit their pin
      # Broadcasts are real-time and less of an enumeration concern than REST API
      StorymapWeb.Endpoint.broadcast(
        "map:world",
        "marker_added", %{
          pin: StorymapWeb.PinJSON.data_with_user(pin)
        })
      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/pins/#{pin}")
      |> render(:show, pin: pin, current_user_id: user_id)
    end
  end

  def show(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    # Only include user_id if user is authenticated
    render(conn, :show, pin: pin, current_user_id: get_current_user_id(conn))
  end

  def update(conn, %{"id" => id, "pin" => pin_params}) do
    pin = Pins.get_pin!(id)
    current_user_id = conn.assigns.current_scope.user.id

    if pin.user_id != current_user_id do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      with {:ok, %Pin{} = pin} <- Pins.update_pin(pin, pin_params) do
        pin = Storymap.Repo.preload(pin, :tags)
        render(conn, :show, pin: pin, current_user_id: current_user_id)
      end
    end
  end

  def delete(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    current_user_id = conn.assigns.current_scope.user.id

    if pin.user_id != current_user_id do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      with {:ok, %Pin{}} <- Pins.delete_pin(pin) do
        send_resp(conn, :no_content, "")
      end
    end
  end
end
