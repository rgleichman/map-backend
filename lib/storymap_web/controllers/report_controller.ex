defmodule StorymapWeb.ReportController do
  use StorymapWeb, :controller

  alias Storymap.ContentReports

  action_fallback StorymapWeb.FallbackController

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"report" => params}) do
    reporter_user_id =
      case conn.assigns[:current_scope] do
        %{user: %{id: id}} -> id
        _ -> nil
      end

    case ContentReports.create_report(params, reporter_user_id) do
      {:ok, report} ->
        conn
        |> put_status(:created)
        |> render(:show, report: report)

      {:error, %Ecto.Changeset{} = changeset} ->
        {:error, changeset}

      {:error, :not_found} ->
        {:error, :not_found}

      {:error, :invalid_subject} ->
        {:error, :invalid_subject}
    end
  end

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, _params) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: StorymapWeb.ErrorJSON)
    |> render(:"422")
  end
end
