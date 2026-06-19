defmodule StorymapWeb.PinTypeController do
  use StorymapWeb, :controller

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType

  action_fallback StorymapWeb.FallbackController

  def index(conn, _params) do
    pin_types = PinTypes.list_enabled_pin_types()
    render(conn, :index, pin_types: pin_types)
  end

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

  def create(conn, %{"pin_type" => params}) do
    scope = conn.assigns.current_scope

    case PinTypes.create_pin_type(scope, params) do
      {:ok, pin_type} ->
        conn
        |> put_status(:created)
        |> render(:show, pin_type: pin_type)

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :unauthorized} ->
        unauthorized(conn)

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  def update(conn, %{"id" => id, "pin_type" => params}) do
    scope = conn.assigns.current_scope
    pin_type = PinTypes.get_pin_type!(id)

    case PinTypes.update_pin_type(scope, pin_type, params) do
      {:ok, pin_type} ->
        render(conn, :show, pin_type: pin_type)

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  def delete(conn, %{"id" => id}) do
    scope = conn.assigns.current_scope
    pin_type = PinTypes.get_pin_type!(id)

    case PinTypes.delete_pin_type(scope, pin_type) do
      {:ok, _} ->
        send_resp(conn, :no_content, "")

      {:error, :forbidden} ->
        forbidden(conn)

      {:error, :in_use} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: StorymapWeb.ErrorJSON)
        |> render(:"422", message: "Cannot delete a pin type that is in use")

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}
    end
  end

  defp forbidden(conn) do
    conn
    |> put_status(:forbidden)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"403")
  end

  defp unauthorized(conn) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"401")
  end

  defp render_not_found(conn) do
    conn
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"404")
  end
end
