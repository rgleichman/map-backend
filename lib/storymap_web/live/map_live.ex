defmodule StorymapWeb.MapLive do
  @moduledoc "Hosts the persistent React map. Non-map LiveViews overlay this page."
  use StorymapWeb, :live_view

  @impl true
  @spec mount(map(), map(), Phoenix.LiveView.Socket.t()) :: {:ok, Phoenix.LiveView.Socket.t()}
  def mount(_params, _session, socket) do
    {:ok, assign(socket, page_title: "Map", community_url: nil, pin_id: nil)}
  end

  @impl true
  @spec handle_params(map(), String.t(), Phoenix.LiveView.Socket.t()) ::
          {:noreply, Phoenix.LiveView.Socket.t()}
  def handle_params(params, uri, socket) do
    community_url = params["community_url"]
    pin_id = pin_id_from_params(params) || pin_id_from_uri(uri)

    socket =
      socket
      |> assign(:community_url, community_url)
      |> assign(:pin_id, pin_id)

    socket =
      if connected?(socket) do
        push_event(socket, "map:set-scope", %{
          community_url: community_url,
          pin_id: pin_id
        })
      else
        socket
      end

    {:noreply, socket}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope} overlay={false}>
      <div id="map-live-bridge" phx-hook="MapLive" class="hidden"></div>
      <h1 class="sr-only">Map</h1>
    </Layouts.app>
    """
  end

  defp pin_id_from_params(%{"pin" => pin}) when is_binary(pin) do
    parse_pin_id(pin)
  end

  defp pin_id_from_params(_), do: nil

  defp pin_id_from_uri(uri) when is_binary(uri) do
    case URI.parse(uri) do
      %URI{query: query} when is_binary(query) ->
        query |> URI.decode_query() |> Map.get("pin") |> parse_pin_id()

      _ ->
        nil
    end
  end

  defp pin_id_from_uri(_), do: nil

  defp parse_pin_id(value) when is_binary(value) do
    case Integer.parse(value) do
      {id, ""} -> id
      _ -> nil
    end
  end

  defp parse_pin_id(_), do: nil
end
