defmodule StorymapWeb.AdminAuth do
  use StorymapWeb, :verified_routes

  import Storymap.Admin, only: [is_admin_level: 1]

  @type on_mount_result ::
          {:cont, Phoenix.LiveView.Socket.t()} | {:halt, Phoenix.LiveView.Socket.t()}

  @spec on_mount({:require_admin_level, integer()}, map(), map(), Phoenix.LiveView.Socket.t()) ::
          on_mount_result()
  def on_mount({:require_admin_level, min_admin_level}, _params, _session, socket)
      when is_integer(min_admin_level) do
    case socket.assigns do
      %{current_scope: %{user: %{admin_level: admin_level}}}
      when is_admin_level(admin_level) and admin_level >= min_admin_level ->
        {:cont, socket}

      _ ->
        {:halt, Phoenix.LiveView.redirect(socket, to: ~p"/")}
    end
  end
end
