defmodule StorymapWeb.VouchController do
  use StorymapWeb, :controller

  alias Storymap.Trust

  action_fallback StorymapWeb.FallbackController

  @spec create(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def create(conn, %{"id" => id}) do
    actor = conn.assigns.current_scope.user

    with {subject_id, ""} <- Integer.parse(id),
         {:ok, _vouch} <- Trust.vouch(actor, subject_id) do
      conn
      |> put_status(:created)
      |> json(%{
        data: %{
          subject_user_id: subject_id,
          vouch_budget_remaining: Trust.vouch_budget_remaining(actor.id)
        }
      })
    else
      :error -> {:error, :not_found}
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, :not_found} -> {:error, :not_found}
      {:error, :self_vouch} -> {:error, :forbidden}
      {:error, :vouch_budget} -> {:error, :forbidden}
      {:error, :already_vouched} -> {:error, :forbidden}
      {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
    end
  end

  @spec delete(Plug.Conn.t(), map()) :: Plug.Conn.t()
  def delete(conn, %{"id" => id}) do
    actor = conn.assigns.current_scope.user

    with {subject_id, ""} <- Integer.parse(id),
         {:ok, :revoked} <- Trust.revoke_vouch(actor, subject_id) do
      conn
      |> put_status(:ok)
      |> json(%{
        data: %{
          subject_user_id: subject_id,
          vouch_budget_remaining: Trust.vouch_budget_remaining(actor.id)
        }
      })
    else
      :error -> {:error, :not_found}
      {:error, :not_found} -> {:error, :not_found}
      {:error, :forbidden} -> {:error, :forbidden}
      {:error, %Ecto.Changeset{} = cs} -> {:error, cs}
    end
  end
end
