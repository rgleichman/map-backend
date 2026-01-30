defmodule StorymapWeb.MapChannel do
  use Phoenix.Channel

  def join("map:world", _message, socket) do
    {:ok, socket}
  end
end
