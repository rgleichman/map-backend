defmodule StorymapWeb.SavedLive.Index do
  use StorymapWeb, :live_view

  alias Storymap.Pins
  alias Storymap.Pins.{HeartAuthorizer, Hearts}

  @impl true
  def mount(_params, _session, socket) do
    user = socket.assigns.current_scope.user

    case HeartAuthorizer.authorize_list(user) do
      :ok ->
        saved_pins = Hearts.list_pins(user)

        {:ok,
         socket
         |> assign(:page_title, "Saved pins")
         |> assign(:saved_pins, saved_pins)}

      {:error, :forbidden} ->
        {:ok,
         socket
         |> put_flash(:error, "Your account is muted.")
         |> push_navigate(to: ~p"/")}
    end
  end
end
