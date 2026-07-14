defmodule StorymapWeb.PinController do
  use StorymapWeb, :controller

  alias Storymap.AdminActivity
  alias Storymap.Pins
  alias Storymap.Pins.{Authorizer, AuthorizerOpts, Pin, PinDiff}
  alias StorymapWeb.ConnAuth
  alias StorymapWeb.PinBroadcast

  action_fallback StorymapWeb.FallbackController

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    current_user = ConnAuth.current_user(conn)
    pins = Pins.list_pins()
    render(conn, :index, pins: pins, current_user: current_user)
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"pin" => pin_params}) do
    user = conn.assigns.current_scope.user

    with :ok <- Authorizer.authorize_create(user),
         {:ok, %Pin{} = pin} <- Pins.create_pin(pin_params, user.id) do
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

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"id" => id}) do
    with {pin_id, ""} <- Integer.parse(id),
         %Pin{} = pin <- Pins.get_pin(pin_id) do
      user = ConnAuth.current_user(conn)
      opts = AuthorizerOpts.for_pin(user, pin)

      with :ok <- Authorizer.authorize_show(user, pin, opts) do
        render(conn, :show,
          pin: pin,
          current_user: user,
          sub_map: opts[:sub_map],
          membership: opts[:membership]
        )
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec backlinks(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def backlinks(conn, %{"id" => id}) do
    with {pin_id, ""} <- Integer.parse(id),
         %Pin{} = pin <- Pins.get_pin(pin_id) do
      user = ConnAuth.current_user(conn)
      opts = AuthorizerOpts.for_pin(user, pin)

      with :ok <- Authorizer.authorize_show(user, pin, opts) do
        backlinks = Pins.list_backlinks(pin.id)

        conn
        |> put_view(json: StorymapWeb.PinJSON)
        |> render(:backlinks, backlinks: backlinks)
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id, "pin" => pin_params}) do
    with {pin_id, ""} <- Integer.parse(id),
         %Pin{} = pin <- Pins.get_pin(pin_id) do
      current_user = conn.assigns.current_scope.user
      opts = Keyword.put(AuthorizerOpts.for_pin(current_user, pin), :user, current_user)

      with :ok <- Authorizer.authorize_update(current_user, pin, opts) do
        before_pin = pin

        with {:ok, %Pin{} = pin} <- Pins.update_pin(pin, pin_params, opts) do
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
            sub_map: opts[:sub_map],
            membership: opts[:membership]
          )
        end
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    with {pin_id, ""} <- Integer.parse(id),
         %Pin{} = pin <- Pins.get_pin(pin_id) do
      current_user = conn.assigns.current_scope.user
      opts = AuthorizerOpts.for_pin(current_user, pin)

      with :ok <- Authorizer.authorize_delete(current_user, pin, opts) do
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
    else
      _ -> {:error, :not_found}
    end
  end
end
