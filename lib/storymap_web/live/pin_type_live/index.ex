defmodule StorymapWeb.PinTypeLive.Index do
  @moduledoc "Browse global custom pin types."
  use StorymapWeb, :live_view

  alias Storymap.PinTypes
  alias Storymap.PinTypes.Policy
  alias StorymapWeb.GardenCopy

  @impl true
  def mount(_params, _session, socket) do
    pin_types = PinTypes.list_all_pin_types()

    {:ok,
     socket
     |> assign(:page_title, GardenCopy.plant_types())
     |> assign(:pin_types, pin_types)
     |> assign(:logged_in?, logged_in?(socket))}
  end

  defp logged_in?(socket) do
    match?(%{user: _}, socket.assigns[:current_scope])
  end

  def can_edit?(%Storymap.Accounts.Scope{user: user}, pin_type) when not is_nil(user) do
    Policy.can_edit?(user, pin_type)
  end

  def can_edit?(_, _), do: false
end
