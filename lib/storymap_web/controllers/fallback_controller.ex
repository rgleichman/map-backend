defmodule StorymapWeb.FallbackController do
  @moduledoc """
  Translates controller action results into valid `Plug.Conn` responses.

  See `Phoenix.Controller.action_fallback/1` for more details.
  """
  use StorymapWeb, :controller

  alias Storymap.Types

  @spec call(Plug.Conn.t(), Types.ecto_err()) :: Plug.Conn.t()
  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: StorymapWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  # This clause is an example of how to handle resources that cannot be found.
  @spec call(Plug.Conn.t(), {:error, :not_found}) :: Plug.Conn.t()
  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(html: StorymapWeb.ErrorHTML, json: StorymapWeb.ErrorJSON)
    |> render(:"404")
  end

  @spec call(Plug.Conn.t(), {:error, :invalid_subject}) :: Plug.Conn.t()
  def call(conn, {:error, :invalid_subject}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{subject: "Invalid subject_type or subject_id"}})
  end

  @spec call(Plug.Conn.t(), {:error, :forbidden}) :: Plug.Conn.t()
  def call(conn, {:error, :forbidden}) do
    conn
    |> put_status(:forbidden)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"403")
  end

  @spec call(Plug.Conn.t(), {:error, :unauthorized}) :: Plug.Conn.t()
  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"401")
  end

  @spec call(Plug.Conn.t(), {:error, :in_use}) :: Plug.Conn.t()
  def call(conn, {:error, :in_use}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"422")
  end
end
