defmodule StorymapWeb.PinTypeController do
  use StorymapWeb, :controller

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType

  action_fallback StorymapWeb.FallbackController

  @spec index(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def index(conn, _params) do
    pin_types = PinTypes.list_enabled_pin_types()
    render(conn, :index, pin_types: pin_types)
  end

  @spec show(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def show(conn, %{"slug" => slug}) do
    case PinTypes.get_by_slug(slug) do
      %CustomPinType{enabled: true} = pin_type ->
        render(conn, :show, pin_type: pin_type)

      %CustomPinType{} ->
        conn |> put_status(:not_found) |> render_not_found()

      nil ->
        conn |> put_status(:not_found) |> render_not_found()
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"pin_type" => params}) do
    scope = conn.assigns.current_scope

    case PinTypes.create_pin_type(scope, params) do
      {:ok, pin_type} ->
        conn
        |> put_status(:created)
        |> render(:show, pin_type: pin_type)

      other ->
        other
    end
  end

  @spec update(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def update(conn, %{"id" => id, "pin_type" => params}) do
    scope = conn.assigns.current_scope
    pin_type = PinTypes.get_pin_type!(id)

    case PinTypes.update_pin_type(scope, pin_type, params) do
      {:ok, pin_type} ->
        render(conn, :show, pin_type: pin_type)

      other ->
        other
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    scope = conn.assigns.current_scope
    pin_type = PinTypes.get_pin_type!(id)

    case PinTypes.delete_pin_type(scope, pin_type) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      other ->
        other
    end
  end

  defp render_not_found(conn) do
    conn
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"404")
  end
end
