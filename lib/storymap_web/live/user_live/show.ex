defmodule StorymapWeb.UserLive.Show do
  use StorymapWeb, :live_view

  alias Storymap.Accounts
  alias Storymap.Pins.{HeartAuthorizer, Hearts}

  @profile_saved_preview_limit 5

  @impl true
  def mount(%{"user_id" => user_id}, _session, socket) do
    case safe_get_user(user_id) do
      {:ok, user} ->
        # Only assign fields that are actually rendered in the template
        # This prevents potential exposure of sensitive data (like email) in LiveView state
        safe_user_data = %{
          id: user.id
        }

        own_profile? = own_profile?(socket, user.id)

        {saved_pins_preview, saved_pins_count} =
          if own_profile? do
            case HeartAuthorizer.authorize_list(user) do
              :ok ->
                preview = Hearts.list_pins(user, limit: @profile_saved_preview_limit)
                {preview, Hearts.count_pins(user)}

              {:error, :forbidden} ->
                {[], 0}
            end
          else
            {[], 0}
          end

        {:ok,
         assign(socket,
           user: safe_user_data,
           not_found: false,
           own_profile?: own_profile?,
           saved_pins_preview: saved_pins_preview,
           saved_pins_count: saved_pins_count
         )}

      :error ->
        {:ok,
         assign(socket,
           not_found: true,
           own_profile?: false,
           saved_pins_preview: [],
           saved_pins_count: 0
         )}
    end
  end

  defp own_profile?(socket, profile_user_id) do
    case socket.assigns[:current_scope] do
      %{user: %{id: id}} -> id == profile_user_id
      _ -> false
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
