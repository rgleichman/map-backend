defmodule StorymapWeb.PinLive.Index do
  use StorymapWeb, :live_view

  alias Storymap.Pins

  @impl true
  def mount(_params, _session, socket) do
    pins = Pins.list_pins() |> Storymap.Repo.preload(:user)
    current_user = get_current_user(socket)
    is_admin = is_super_admin?(current_user)

    {:ok, assign(socket, pins: pins, current_user: current_user, is_admin: is_admin)}
  end

  defp get_current_user(socket) do
    case socket.assigns[:current_scope] do
      %{user: %{} = user} -> user
      _ -> nil
    end
  end

  defp is_super_admin?(user) do
    user && user.admin_level && user.admin_level >= 10
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
