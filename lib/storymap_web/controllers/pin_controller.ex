defmodule StorymapWeb.PinController do
  use StorymapWeb, :controller

  alias Storymap.AdminActivity
  alias Storymap.Pins
  alias Storymap.Pins.Pin
  alias Storymap.Pins.PinDiff

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

    if user.muted_at do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      pin_result = Pins.create_pin(pin_params, user.id)

      with {:ok, %Pin{} = pin} <- pin_result do
        pin = Storymap.Repo.preload(pin, :tags)

        _ =
          AdminActivity.record_event("pin_created", user.id, %{
            "pin_id" => pin.id,
            "title" => pin.title
          })

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
  end

  def show(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    # Only include user_id if user is authenticated
    render(conn, :show, pin: pin, current_user: get_current_user(conn))
  end

  def update(conn, %{"id" => id, "pin" => pin_params}) do
    pin = Pins.get_pin!(id)
    current_user = conn.assigns.current_scope.user

    if current_user.muted_at do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      if pin.user_id != current_user.id and current_user.admin_level < 1 do
        conn
        |> put_status(:forbidden)
        |> put_view(json: StorymapWeb.ErrorJSON)
        |> render(:"403")
      else
        pin = Storymap.Repo.preload(pin, :tags)
        before_pin = pin

        with {:ok, %Pin{} = pin} <- Pins.update_pin(pin, pin_params) do
          pin = Storymap.Repo.preload(pin, :tags)

          _ =
            AdminActivity.record_event("pin_updated", current_user.id, %{
              "pin_id" => pin.id,
              "title" => pin.title,
              "diff" => PinDiff.diff(before_pin, pin)
            })

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
  end

  def delete(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id)
    current_user = conn.assigns.current_scope.user

    if current_user.muted_at do
      conn
      |> put_status(:forbidden)
      |> put_view(json: StorymapWeb.ErrorJSON)
      |> render(:"403")
    else
      if pin.user_id != current_user.id and current_user.admin_level < 1 do
        conn
        |> put_status(:forbidden)
        |> put_view(json: StorymapWeb.ErrorJSON)
        |> render(:"403")
      else
        pin_id = pin.id
        pin_title = pin.title

        with {:ok, %Pin{}} <- Pins.delete_pin(pin) do
          _ =
            AdminActivity.record_event("pin_deleted", current_user.id, %{
              "pin_id" => pin_id,
              "title" => pin_title
            })

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
end
