defmodule StorymapWeb.StaticLive.Help do
  use StorymapWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :page_title, "Help")}
  end
end
