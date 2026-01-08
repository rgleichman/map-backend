defmodule StorymapWeb.UserLive.Show do
  use StorymapWeb, :live_view

  alias Storymap.Accounts

  @impl true
  def mount(%{"user_id" => user_id}, _session, socket) do
    case safe_get_user(user_id) do
      {:ok, user} -> {:ok, assign(socket, user: user, not_found: false)}
      :error -> {:ok, assign(socket, not_found: true)}
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
