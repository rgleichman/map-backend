defmodule StorymapWeb.StaticLive.SubMaps do
  @moduledoc "Public summary of the sub-maps design (see docs/SUB_MAPS.md in the repo)."
  use StorymapWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :page_title, "Sub-maps design")}
  end
end
