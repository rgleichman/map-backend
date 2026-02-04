defmodule StorymapWeb.MapController do
  use StorymapWeb, :controller

  alias MapLibre

  def index(conn, _params) do
    render(conn, :map)
  end

  def style(conn, _params) do
    maptiler_key = Application.get_env(:storymap, :maptiler_api_key)

    spec =
      MapLibre.new(style: :terrain, key: maptiler_key)
      |> MapLibre.to_spec()
      |> Map.put("projection", %{"type" => "globe"})

    json(conn, spec)
  end
end
