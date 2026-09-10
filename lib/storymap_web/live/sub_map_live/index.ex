defmodule StorymapWeb.SubMapLive.Index do
  @moduledoc "Browse and search public communities; private membership list when signed in."
  use StorymapWeb, :live_view

  alias Storymap.Accounts.Scope
  alias Storymap.SubMaps

  @impl true
  @spec mount(map(), map(), Phoenix.LiveView.Socket.t()) :: {:ok, Phoenix.LiveView.Socket.t()}
  def mount(_params, _session, socket) do
    {:ok,
     socket
     |> assign(:page_title, "Communities")
     |> assign(:search_query, "")
     |> load_my_memberships()
     |> load_sub_maps()}
  end

  @impl true
  @spec handle_event(String.t(), map(), Phoenix.LiveView.Socket.t()) ::
          {:noreply, Phoenix.LiveView.Socket.t()}
  def handle_event("search", %{"q" => q}, socket) do
    {:noreply, socket |> assign(:search_query, String.trim(q)) |> load_sub_maps()}
  end

  def handle_event("search", _params, socket) do
    {:noreply, socket |> assign(:search_query, "") |> load_sub_maps()}
  end

  @spec load_my_memberships(Phoenix.LiveView.Socket.t()) :: Phoenix.LiveView.Socket.t()
  defp load_my_memberships(socket) do
    my_memberships =
      case socket.assigns[:current_scope] do
        %Scope{user: %{}} = scope -> SubMaps.list_for_user(scope)
        _ -> []
      end

    assign(socket, :my_memberships, my_memberships)
  end

  @spec load_sub_maps(Phoenix.LiveView.Socket.t()) :: Phoenix.LiveView.Socket.t()
  defp load_sub_maps(socket) do
    sub_maps = SubMaps.list_public(q: socket.assigns.search_query)
    assign(socket, :sub_maps, sub_maps)
  end
end
