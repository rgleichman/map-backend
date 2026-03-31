defmodule StorymapWeb.Layouts do
  @moduledoc """
  This module holds layouts and related functionality
  used by your application.
  """
  use StorymapWeb, :html

  # Embed all files in layouts/* within this module.
  # The default root.html.heex file contains the HTML
  # skeleton of your application, namely HTML headers
  # and other static content.
  embed_templates "layouts/*"

  @github_repo "https://github.com/rgleichman/map-backend"

  @doc """
  Renders your app layout.

  This function is typically invoked from every template,
  and it often contains your application menu, sidebar,
  or similar.

  ## Examples

      <Layouts.app flash={@flash}>
        <h1>Content</h1>
      </Layouts.app>

  """
  attr :flash, :map, required: true, doc: "the map of flash messages"

  attr :current_scope, :map,
    default: nil,
    doc: "the current [scope](https://hexdocs.pm/phoenix/scopes.html)"

  slot :inner_block, required: true

  def app(assigns) do
    ~H"""
    <main id="main-content" class="flex-1 h-full" tabindex="-1">
      <div class="h-full">
        {render_slot(@inner_block)}
      </div>
    </main>

    <.flash_group flash={@flash} />
    """
  end

  @doc """
  Shows the flash group with standard titles and content.

  ## Examples

      <.flash_group flash={@flash} />
  """
  attr :flash, :map, required: true, doc: "the map of flash messages"
  attr :id, :string, default: "flash-group", doc: "the optional id of flash container"

  def flash_group(assigns) do
    ~H"""
    <div id={@id} aria-live="polite">
      <.flash kind={:info} flash={@flash} />
      <.flash kind={:error} flash={@flash} />

      <.flash
        id="client-error"
        kind={:error}
        title={gettext("We can't find the internet")}
        phx-disconnected={show(".phx-client-error #client-error") |> JS.remove_attribute("hidden")}
        phx-connected={hide("#client-error") |> JS.set_attribute({"hidden", ""})}
        hidden
      >
        {gettext("Attempting to reconnect")}
        <.icon name="hero-arrow-path" class="ml-1 size-3 motion-safe:animate-spin" />
      </.flash>

      <.flash
        id="server-error"
        kind={:error}
        title={gettext("Something went wrong!")}
        phx-disconnected={show(".phx-server-error #server-error") |> JS.remove_attribute("hidden")}
        phx-connected={hide("#server-error") |> JS.set_attribute({"hidden", ""})}
        hidden
      >
        {gettext("Attempting to reconnect")}
        <.icon name="hero-arrow-path" class="ml-1 size-3 motion-safe:animate-spin" />
      </.flash>
    </div>
    """
  end

  @doc """
  Renders navigation menu items.

  ## Examples

      <.nav_menu_items variant="desktop" current_path={@conn.request_path} current_scope={@current_scope} />
      <.nav_menu_items variant="mobile" current_path={@conn.request_path} current_scope={@current_scope} />
  """
  attr :variant, :string, required: true, values: ["desktop", "mobile"]
  attr :current_path, :string, required: true
  attr :current_scope, :map, default: nil

  def nav_menu_items(assigns) do
    assigns = assign(assigns, :github_url, @github_repo)

    ~H"""
    <%= if @current_path != "/" && @current_path != "/map" do %>
      <li>
        <%= if @variant == "desktop" do %>
          <a href="/" class="btn btn-ghost">Map</a>
        <% else %>
          <a href="/" class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300">Map</a>
        <% end %>
      </li>
    <% end %>
    <li>
      <%= if @variant == "desktop" do %>
        <button id="party-button" type="button" class="btn btn-ghost" aria-label="Party mode">
          🎉 Party
        </button>
      <% else %>
        <button
          id="party-button-mobile"
          type="button"
          class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          aria-label="Party mode"
        >
          🎉 Party
        </button>
      <% end %>
    </li>
    <%= if @current_scope do %>
      <li>
        <%= if @variant == "desktop" do %>
          <div class="dropdown dropdown-end !z-[60]">
            <div tabindex="0" role="button" class="btn btn-ghost">{@current_scope.user.email}</div>
            <ul
              tabindex="0"
              class="dropdown-content menu bg-base-100 rounded-box !z-[60] w-52 p-2 shadow"
            >
              <li>
                <.link
                  href={~p"/users/settings"}
                  class="w-full px-4 py-2 text-left cursor-pointer hover:bg-base-200"
                >
                  Settings
                </.link>
              </li>
              <li>
                <.link
                  href={~p"/users/log-out"}
                  method="delete"
                  class="w-full px-4 py-2 text-left cursor-pointer hover:bg-base-200"
                >
                  Log out
                </.link>
              </li>
            </ul>
          </div>
        <% else %>
          <span class="block px-4 py-2">{@current_scope.user.email}</span>
        <% end %>
      </li>
      <%= if @variant == "mobile" && @current_scope do %>
        <li>
          <.link
            href={~p"/users/settings"}
            class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          >
            Settings
          </.link>
        </li>
        <li>
          <.link
            href={~p"/users/log-out"}
            method="delete"
            class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          >
            Log out
          </.link>
        </li>
      <% end %>
      <%= if @current_scope.user.admin_level >= 10 do %>
        <li>
          <%= if @variant == "desktop" do %>
            <.link href={~p"/admin/users"} class="btn btn-ghost">Admin</.link>
          <% else %>
            <.link
              href={~p"/admin/users"}
              class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
            >
              Admin
            </.link>
          <% end %>
        </li>
      <% end %>
    <% else %>
      <li>
        <%= if @variant == "desktop" do %>
          <.link href={~p"/users/register"} class="btn btn-ghost">Register</.link>
        <% else %>
          <.link
            href={~p"/users/register"}
            class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          >
            Register
          </.link>
        <% end %>
      </li>
      <li>
        <%= if @variant == "desktop" do %>
          <.link href={~p"/users/log-in"} class="btn btn-ghost">Log in</.link>
        <% else %>
          <.link
            href={~p"/users/log-in"}
            class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          >
            Log in
          </.link>
        <% end %>
      </li>
    <% end %>
    """
  end
end
