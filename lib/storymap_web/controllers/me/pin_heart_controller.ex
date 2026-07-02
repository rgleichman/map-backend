defmodule StorymapWeb.Me.PinHeartController do
  use StorymapWeb, :controller

  alias Storymap.Pins.Hearts
  alias Storymap.Pins.HeartAuthorizer
  action_fallback StorymapWeb.FallbackController

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    user = conn.assigns.current_scope.user

    with :ok <- HeartAuthorizer.authorize_list(user) do
      ids = Hearts.list_pin_ids(user)
      json(conn, %{data: ids})
    end
  end

  @spec pins(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def pins(conn, _params) do
    user = conn.assigns.current_scope.user

    with :ok <- HeartAuthorizer.authorize_list(user) do
      pins = Hearts.list_pins(user)

      conn
      |> put_view(json: StorymapWeb.Me.PinHeartJSON)
      |> render(:pins, pins: pins, current_user: user)
    end
  end
end
