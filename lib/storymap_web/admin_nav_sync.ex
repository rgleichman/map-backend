defmodule StorymapWeb.AdminNavSync do
  @moduledoc false

  import Phoenix.LiveView, only: [connected?: 1]

  alias Phoenix.LiveView

  @nav_topic "admin:nav_path"

  def nav_topic, do: @nav_topic

  def on_mount(:default, _params, _session, socket) do
    if connected?(socket) do
      sync_admin_nav(socket)
    end

    {:cont, socket}
  end

  def sync_admin_nav(socket) do
    path =
      case LiveView.get_connect_info(socket, :uri) do
        %URI{path: path} when is_binary(path) -> path
        _ -> "/"
      end

    Phoenix.PubSub.broadcast(Storymap.PubSub, @nav_topic, {:path_changed, path})
    socket
  end
end
