defmodule StorymapWeb.SavedLive.Index do
  use StorymapWeb, :live_view

  alias Storymap.Pins
  alias Storymap.Pins.Hearts

  @impl true
  def mount(_params, _session, socket) do
    user = socket.assigns.current_scope.user
    saved_pins = Hearts.list_pins(user)

    {:ok,
     socket
     |> assign(:page_title, "Saved pins")
     |> assign(:saved_pins, saved_pins)}
  end
end
