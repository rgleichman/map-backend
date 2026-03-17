defmodule StorymapWeb.AdminAuth do
  use StorymapWeb, :verified_routes

  def on_mount({:require_admin_level, min_admin_level}, _params, _session, socket)
      when is_integer(min_admin_level) do
    case socket.assigns do
      %{current_scope: %{user: %{admin_level: admin_level}}}
      when admin_level >= min_admin_level ->
        {:cont, socket}

      _ ->
        {:halt, Phoenix.LiveView.redirect(socket, to: ~p"/")}
    end
  end
end
