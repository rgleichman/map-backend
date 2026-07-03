defmodule StorymapWeb.PinHeartController do
  use StorymapWeb, :controller

  alias Storymap.Pins
  alias Storymap.Pins.{HeartAuthorizer, Hearts}

  action_fallback StorymapWeb.FallbackController

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"id" => id}) do
    with {pin_id, ""} <- Integer.parse(id),
         pin when not is_nil(pin) <- Pins.get_pin(pin_id) do
      pin = Storymap.Repo.preload(pin, :sub_map)
      user = conn.assigns.current_scope.user
      opts = HeartAuthorizer.authorizer_opts(user, pin)

      with :ok <- HeartAuthorizer.authorize_heart(user, pin, opts),
           {:ok, _heart} <- Hearts.heart(user, pin) do
        send_resp(conn, :created, "")
      end
    else
      _ -> {:error, :not_found}
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    with {pin_id, ""} <- Integer.parse(id),
         pin when not is_nil(pin) <- Pins.get_pin(pin_id) do
      user = conn.assigns.current_scope.user

      with :ok <- HeartAuthorizer.authorize_unheart(user) do
        Hearts.unheart(user, pin)
        send_resp(conn, :no_content, "")
      end
    else
      _ -> {:error, :not_found}
    end
  end
end
