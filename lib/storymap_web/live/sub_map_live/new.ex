defmodule StorymapWeb.SubMapLive.New do
  @moduledoc """
  Create sub-map wizard. Form wiring follows `docs/SUB_MAPS.md` when `Storymap.SubMaps` ships.
  """
  use StorymapWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :page_title, "Create community")}
  end
end
