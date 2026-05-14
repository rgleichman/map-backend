defmodule StorymapWeb.AdminReportsController do
  use StorymapWeb, :controller

  alias Storymap.ContentReports

  def unresolved_count(conn, _params) do
    scope = conn.assigns.current_scope
    count = ContentReports.unresolved_count(scope)
    json(conn, %{unresolved_count: count})
  end
end
