defmodule StorymapWeb.ContributionsLive.Index do
  use StorymapWeb, :live_view

  alias Storymap.Pins

  @impl true
  @spec mount(map(), map(), Phoenix.LiveView.Socket.t()) :: {:ok, Phoenix.LiveView.Socket.t()}
  def mount(_params, _session, socket) do
    user = socket.assigns.current_scope.user
    contributions = Pins.list_pins_by_user(user.id)

    {:ok,
     socket
     |> assign(:page_title, "My contributions")
     |> assign(:contributions, contributions)}
  end
end
