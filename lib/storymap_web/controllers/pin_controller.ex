defmodule StorymapWeb.PinController do
  use StorymapWeb, :controller

  alias Storymap.AdminActivity
  alias Storymap.Pins
  alias Storymap.Pins.{Authorizer, Pin, PinDiff}
  alias Storymap.SubMaps
  alias StorymapWeb.PinBroadcast

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

    case Authorizer.authorize_create(user) do
      {:error, :forbidden} ->
        forbidden(conn)

      :ok ->
        with {:ok, %Pin{} = pin} <- Pins.create_pin(pin_params, user.id) do
          pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

          _ =
            AdminActivity.record_event("pin_created", user.id, %{
              "pin_id" => pin.id,
              "title" => pin.title
            })

          PinBroadcast.broadcast_pin_event(pin, :created)

          conn
          |> put_status(:created)
          |> put_resp_header("location", ~p"/api/pins/#{pin}")
          |> render(:show, pin: pin, current_user: user)
        end
    end
  end

  def show(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id) |> Storymap.Repo.preload(:sub_map)
    user = get_current_user(conn)
    sub_map = pin.sub_map
    membership = if sub_map && user, do: SubMaps.get_membership(sub_map.id, user.id), else: nil

    render(conn, :show,
      pin: pin,
      current_user: user,
      sub_map: sub_map,
      membership: membership
    )
  end

  def update(conn, %{"id" => id, "pin" => pin_params}) do
    pin = Pins.get_pin!(id) |> Storymap.Repo.preload(:sub_map)
    current_user = conn.assigns.current_scope.user
    sub_map = pin.sub_map
    membership = sub_map && SubMaps.get_membership(sub_map.id, current_user.id)
    opts = [sub_map: sub_map, membership: membership, user: current_user]

    case Authorizer.authorize_update(current_user, pin, opts) do
      {:error, :forbidden} ->
        forbidden(conn)

      :ok ->
        pin = Storymap.Repo.preload(pin, :tags)
        before_pin = pin

        with {:ok, %Pin{} = pin} <- Pins.update_pin(pin, pin_params, opts) do
          pin = Storymap.Repo.preload(pin, [:tags, :sub_map])

          _ =
            AdminActivity.record_event(
              "pin_updated",
              current_user.id,
              %{
                "pin_id" => pin.id,
                "title" => pin.title,
                "diff" => PinDiff.diff(before_pin, pin)
              },
              sub_map_id: pin.sub_map_id
            )

          PinBroadcast.broadcast_pin_event(pin, :updated)

          render(conn, :show,
            pin: pin,
            current_user: current_user,
            sub_map: sub_map,
            membership: membership
          )
        end
    end
  end

  def delete(conn, %{"id" => id}) do
    pin = Pins.get_pin!(id) |> Storymap.Repo.preload(:sub_map)
    current_user = conn.assigns.current_scope.user
    sub_map = pin.sub_map
    membership = sub_map && SubMaps.get_membership(sub_map.id, current_user.id)
    opts = [sub_map: sub_map, membership: membership]

    case Authorizer.authorize_delete(current_user, pin, opts) do
      {:error, :forbidden} ->
        forbidden(conn)

      :ok ->
        pin = Storymap.Repo.preload(pin, :sub_map)
        pin_id = pin.id
        pin_title = pin.title

        with {:ok, %Pin{}} <- Pins.delete_pin(pin) do
          _ =
            AdminActivity.record_event(
              "pin_deleted",
              current_user.id,
              %{"pin_id" => pin_id, "title" => pin_title},
              sub_map_id: pin.sub_map_id
            )

          PinBroadcast.broadcast_pin_event(pin, :deleted)

          send_resp(conn, :no_content, "")
        end
    end
  end

  defp forbidden(conn) do
    conn
    |> put_status(:forbidden)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"403")
  end
end
