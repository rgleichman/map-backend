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
    path = assigns.current_path

    assigns =
      assigns
      |> assign(:github_url, @github_repo)
      |> assign(:privacy_active?, path == "/privacy-policy")
      |> assign(:settings_active?, String.starts_with?(path, "/users/settings"))
      |> assign(:admin_active?, String.starts_with?(path, "/admin"))
      |> assign(:register_active?, path == "/users/register")
      |> assign(:login_active?, String.starts_with?(path, "/users/log-in"))

    ~H"""
    <%= if @current_path != "/" && @current_path != "/map" do %>
      <li>
        <%= if @variant == "desktop" do %>
          <.link navigate={~p"/"} class={nav_btn_classes(false)}>Map</.link>
        <% else %>
          <.link
            navigate={~p"/"}
            class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          >
            Map
          </.link>
        <% end %>
      </li>
    <% end %>
    <li>
      <%= if @variant == "desktop" do %>
        <button id="party-button" type="button" class={nav_btn_classes(false)} aria-label="Party mode">
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
    <%= if @variant == "mobile" do %>
      <li>
        <a
          href={@github_url}
          class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
      </li>
      <li>
        <.link
          navigate={~p"/privacy-policy"}
          class={[
            "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
            @privacy_active? && "bg-base-300 font-medium"
          ]}
          aria-current={if(@privacy_active?, do: "page")}
        >
          Privacy Policy
        </.link>
      </li>
    <% end %>
    <%= if @current_scope do %>
      <%= if @variant == "desktop" do %>
        <li class="dropdown dropdown-end hidden md:block">
          <button
            type="button"
            tabindex="0"
            class="btn btn-ghost max-w-[14rem] gap-1 font-normal"
            aria-haspopup="menu"
            aria-label={gettext("Account menu")}
          >
            <span class="truncate" title={"User ##{@current_scope.user.id}"}>
              Account
            </span>
            <.icon name="hero-chevron-down" class="size-4 shrink-0 opacity-60" />
          </button>
          <ul
            tabindex="0"
            class="dropdown-content menu bg-base-200 rounded-box z-[60] w-56 p-2 shadow-lg border border-base-300"
          >
            <li
              class="menu-title max-w-[13rem] truncate text-xs font-normal normal-case opacity-80"
              title={"User ##{@current_scope.user.id}"}
            >
              User #{@current_scope.user.id}
            </li>
            <%= if @current_scope.user.admin_level >= 10 do %>
              <li>
                <.link
                  href={~p"/admin/users"}
                  class={["rounded-lg", @admin_active? && "active"]}
                  aria-current={if(@admin_active?, do: "page")}
                >
                  Admin
                </.link>
              </li>
            <% end %>
            <li>
              <.link
                href={~p"/users/settings"}
                class={["rounded-lg", @settings_active? && "active"]}
                aria-current={if(@settings_active?, do: "page")}
              >
                Settings
              </.link>
            </li>
            <li>
              <.link href={~p"/users/log-out"} method="delete" class="rounded-lg">
                Log out
              </.link>
            </li>
          </ul>
        </li>
      <% else %>
        <li>
          <span class="block px-4 py-2 text-sm font-medium text-base-content/70 border-t border-base-300 mt-2">
            User #{@current_scope.user.id}
          </span>
        </li>
        <%= if @current_scope.user.admin_level >= 10 do %>
          <li>
            <.link
              href={~p"/admin/users"}
              class={[
                "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
                @admin_active? && "bg-base-300 font-medium"
              ]}
              aria-current={if(@admin_active?, do: "page")}
            >
              Admin
            </.link>
          </li>
        <% end %>
        <li>
          <.link
            href={~p"/users/settings"}
            class={[
              "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
              @settings_active? && "bg-base-300 font-medium"
            ]}
            aria-current={if(@settings_active?, do: "page")}
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
    <% else %>
      <li>
        <%= if @variant == "desktop" do %>
          <.link
            href={~p"/users/register"}
            class={nav_btn_classes(@register_active?)}
            aria-current={if(@register_active?, do: "page")}
          >
            Register
          </.link>
        <% else %>
          <.link
            href={~p"/users/register"}
            class={[
              "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
              @register_active? && "bg-base-300 font-medium"
            ]}
            aria-current={if(@register_active?, do: "page")}
          >
            Register
          </.link>
        <% end %>
      </li>
      <li>
        <%= if @variant == "desktop" do %>
          <.link
            href={~p"/users/log-in"}
            class={nav_btn_classes(@login_active?)}
            aria-current={if(@login_active?, do: "page")}
          >
            Log in
          </.link>
        <% else %>
          <.link
            href={~p"/users/log-in"}
            class={[
              "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
              @login_active? && "bg-base-300 font-medium"
            ]}
            aria-current={if(@login_active?, do: "page")}
          >
            Log in
          </.link>
        <% end %>
      </li>
    <% end %>
    """
  end

  @doc """
  Desktop-only floating GitHub and Privacy links at the bottom of the viewport.
  """
  attr :current_path, :string, required: true

  def desktop_floating_footer_links(assigns) do
    assigns =
      assigns
      |> assign(:github_url, @github_repo)
      |> assign(:privacy_active?, assigns.current_path == "/privacy-policy")

    footer_link_base =
      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium " <>
        "text-white bg-transparent shadow-none transition-opacity hover:opacity-80 " <>
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0 " <>
        "[text-shadow:-1px_-1px_0_#000,1px_-1px_0_#000,-1px_1px_0_#000,1px_1px_0_#000," <>
        "-1px_0_0_#000,1px_0_0_#000,0_-1px_0_#000,0_1px_0_#000]"

    assigns = assign(assigns, :footer_link_base, footer_link_base)

    ~H"""
    <%!-- z-30: below map React overlays (placement bar, side panel) at z-40 --%>
    <div class="pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden pb-5 md:flex md:justify-center">
      <nav
        class="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-4"
        aria-label="Site links"
      >
        <a
          href={@github_url}
          class={@footer_link_base}
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>
        <.link
          navigate={~p"/privacy-policy"}
          class={[
            @footer_link_base,
            @privacy_active? && "font-semibold underline decoration-2 underline-offset-2"
          ]}
          aria-current={if(@privacy_active?, do: "page")}
        >
          Privacy Policy
        </.link>
      </nav>
    </div>
    """
  end

  defp nav_btn_classes(active?) do
    ["btn", "btn-ghost", if(active?, do: "btn-active")]
  end
end
