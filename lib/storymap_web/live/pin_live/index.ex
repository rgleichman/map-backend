defmodule StorymapWeb.PinLive.Index do
  use StorymapWeb, :live_view

  alias Storymap.Pins

  @impl true
  def mount(_params, _session, socket) do
    current_user = get_current_user(socket)
    is_admin = super_admin?(current_user)

    pins = Pins.list_pins()
    pins = if is_admin, do: Storymap.Repo.preload(pins, :user), else: pins

    {:ok, assign(socket, pins: pins, is_admin: is_admin)}
  end

  defp get_current_user(socket) do
    case socket.assigns[:current_scope] do
      %{user: %{} = user} -> user
      _ -> nil
    end
  end

  defp super_admin?(%{admin_level: level}) when is_integer(level) and level >= 10, do: true
  defp super_admin?(_), do: false

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
