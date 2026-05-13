defmodule StorymapWeb.AdminActivityController do
  use StorymapWeb, :controller

  alias Storymap.AdminActivity

  def unread_count(conn, _params) do
    scope = conn.assigns.current_scope
    count = AdminActivity.unread_count(scope)
    json(conn, %{unread_count: count})
  end
end
