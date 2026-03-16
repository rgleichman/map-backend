defmodule StorymapWeb.PinController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.Pin

  action_fallback StorymapWeb.FallbackController

  def index(conn, _params) do
    current_user = get_current_user(conn)
    pins = Pins.list_pins()
    render(conn, :index, pins: pins, current_user: current_user)
  end

  defp get_current_user(conn) do
    case conn.assigns[:current_scope] do
      %{user: %{} = user} -> user
      _ -> nil
    end
  end

  def create(conn, %{"pin" => pin_params}) do
    user = conn.assigns.current_scope.user
    pin_result = Pins.create_pin(pin_params, user.id)

    with {:ok, %Pin{} = pin} <- pin_result do
      pin = Storymap.Repo.preload(pin, :tags)
      # Broadcast without user_id to prevent user enumeration
      # Creator receives full pin data (with user_id) from API response
      StorymapWeb.Endpoint.broadcast(
        "map:world",
        "marker_added",
        %{pin: StorymapWeb.PinJSON.data(pin)}
      )

      conn
      |> put_status(:created)
      |> put_resp_header("location", ~p"/api/pins/#{pin}")
      |> render(:show, pin: pin, current_user: user)
    end
  end

  def show(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    # Only include user_id if user is authenticated
    render(conn, :show, pin: pin, current_user: get_current_user(conn))
  end

  def update(conn, %{"id" => id, "pin" => pin_params}) do
    pin = Pins.get_pin!(id)
    current_user = conn.assigns.current_scope.user

    if pin.user_id != current_user.id and current_user.admin_level < 1 do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      with {:ok, %Pin{} = pin} <- Pins.update_pin(pin, pin_params) do
        pin = Storymap.Repo.preload(pin, :tags)
        # Broadcast without user_id to prevent user enumeration
        # Editor receives full pin data (with user_id) from API response
        StorymapWeb.Endpoint.broadcast(
          "map:world",
          "marker_updated",
          %{pin: StorymapWeb.PinJSON.data(pin)}
        )

        render(conn, :show, pin: pin, current_user: current_user)
      end
    end
  end

  def delete(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    current_user = conn.assigns.current_scope.user

    if pin.user_id != current_user.id and current_user.admin_level < 1 do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      pin_id = pin.id

      with {:ok, %Pin{}} <- Pins.delete_pin(pin) do
        # Broadcast deletion to all users
        StorymapWeb.Endpoint.broadcast(
          "map:world",
          "marker_deleted",
          %{pin_id: pin_id}
        )

        send_resp(conn, :no_content, "")
      end
    end
  end
end
