defmodule StorymapWeb.PinLive.Index do
  @moduledoc """
  Public pin catalog. Uses LiveView streams so the list scales without holding
  a full assign on the socket as pin count grows.
  """
  use StorymapWeb, :live_view

  alias Storymap.Pins
  alias Storymap.Pins.PinTypeColors
  alias Storymap.Pins.Policy

  @impl true
  def mount(_params, _session, socket) do
    current_user = get_current_user(socket)
    is_admin = Policy.catalog_admin?(current_user)

    pins = Pins.list_pins()
    pins = if is_admin, do: Storymap.Repo.preload(pins, :user), else: pins

    {:ok,
     socket
     |> assign(:is_admin, is_admin)
     |> stream(:pins, pins)}
  end

  defp get_current_user(socket) do
    case socket.assigns[:current_scope] do
      %{user: %{} = user} -> user
      _ -> nil
    end
  end

  def format_relative_time(%DateTime{} = datetime) do
    now = DateTime.utc_now()
    seconds = DateTime.diff(now, datetime, :second)

    cond do
      seconds < 60 ->
        "just now"

      seconds < 3600 ->
        minutes = div(seconds, 60)
        "#{minutes} minute#{if minutes > 1, do: "s", else: ""} ago"

      seconds < 86400 ->
        hours = div(seconds, 3600)
        "#{hours} hour#{if hours > 1, do: "s", else: ""} ago"

      seconds < 604_800 ->
        days = div(seconds, 86400)
        "#{days} day#{if days > 1, do: "s", else: ""} ago"

      true ->
        "on #{Calendar.strftime(datetime, "%b %d, %Y")}"
    end
  end
end
