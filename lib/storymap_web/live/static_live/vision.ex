defmodule StorymapWeb.StaticLive.Vision do
  use StorymapWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, :page_title, "Vision")}
  end
end
