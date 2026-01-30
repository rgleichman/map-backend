defmodule StorymapWeb.UserLive.Show do
  use StorymapWeb, :live_view

  alias Storymap.Accounts

  @impl true
  def mount(%{"user_id" => user_id}, _session, socket) do
    case safe_get_user(user_id) do
      {:ok, user} ->
        # Only assign fields that are actually rendered in the template
        # This prevents potential exposure of sensitive data (like email) in LiveView state
        safe_user_data = %{
          id: user.id,
          confirmed_at: user.confirmed_at
        }

        {:ok, assign(socket, user: safe_user_data, not_found: false)}

      :error ->
        {:ok, assign(socket, not_found: true)}
    end
  end

  defp safe_get_user(user_id) do
    try do
      {:ok, Accounts.get_user!(user_id)}
    rescue
      Ecto.NoResultsError -> :error
    end
  end
end
