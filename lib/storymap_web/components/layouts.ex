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
  @github_issues_new "https://github.com/rgleichman/map-backend/issues/new/choose"

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
  attr :conn, :map, default: nil

  def nav_menu_items(assigns) do
    path = assigns.current_path

    assigns =
      assigns
      |> assign(:github_url, @github_repo)
      |> assign(:github_issues_new_url, @github_issues_new)
      |> assign(:privacy_active?, path == "/privacy-policy")
      |> assign(:settings_active?, String.starts_with?(path, "/users/settings"))
      |> assign(:saved_active?, path == "/saved")
      |> assign(:user_profile_active?, user_profile_active?(path, assigns.current_scope))
      |> assign(:admin_active?, String.starts_with?(path, "/admin/users"))
      |> assign(:admin_activity_active?, String.starts_with?(path, "/admin/activity"))
      |> assign(:admin_reports_active?, String.starts_with?(path, "/admin/reports"))
      |> assign(:login_active?, String.starts_with?(path, "/users/log-in"))
      |> assign(:about_active?, path == "/about")
      |> assign(:vision_active?, path == "/vision")
      |> assign(:help_active?, path == "/help")
      |> assign(:communities_active?, path == "/m" || String.starts_with?(path, "/m/"))

    ~H"""
    <li>
      <%= if @variant == "desktop" do %>
        <.link
          navigate={~p"/m"}
          class={nav_btn_classes(@communities_active?)}
          aria-current={if(@communities_active?, do: "page")}
        >
          Communities
        </.link>
      <% else %>
        <.link
          navigate={~p"/m"}
          class={[
            "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
            @communities_active? && "bg-base-300 font-medium"
          ]}
          aria-current={if(@communities_active?, do: "page")}
        >
          Communities
        </.link>
      <% end %>
    </li>
    <%= if @current_path != "/" && @current_path != "/map" && !map_full_bleed_path?(@current_path) do %>
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
        <.button id="party-button" type="button" variant="action" aria-label="Party mode">
          🎉 Party
        </.button>
      <% else %>
        <.button
          id="party-button-mobile"
          type="button"
          variant="action"
          class="w-full justify-start drawer-close"
          aria-label="Party mode"
        >
          🎉 Party
        </.button>
      <% end %>
    </li>
    <li>
      <%= if @variant == "desktop" do %>
        <.link
          navigate={~p"/help"}
          class={nav_btn_classes(@help_active?)}
          aria-current={if(@help_active?, do: "page")}
        >
          Help
        </.link>
      <% else %>
        <.link
          navigate={~p"/help"}
          class={[
            "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
            @help_active? && "bg-base-300 font-medium"
          ]}
          aria-current={if(@help_active?, do: "page")}
        >
          Help
        </.link>
      <% end %>
    </li>
    <%= if @variant == "mobile" do %>
      <li>
        <.link
          navigate={~p"/about"}
          class={[
            "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
            @about_active? && "bg-base-300 font-medium"
          ]}
          aria-current={if(@about_active?, do: "page")}
        >
          About
        </.link>
      </li>
      <li>
        <.link
          navigate={~p"/vision"}
          class={[
            "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
            @vision_active? && "bg-base-300 font-medium"
          ]}
          aria-current={if(@vision_active?, do: "page")}
        >
          Vision
        </.link>
      </li>
      <li>
        <a
          href={@github_issues_new_url}
          class="block w-full text-left py-3 px-4 drawer-close hover:bg-base-300"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report an issue
        </a>
      </li>
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
        <.admin_nav_live_render
          :if={@conn && @current_scope && Storymap.Admin.admin?(@current_scope.user)}
          conn={@conn}
          current_scope={@current_scope}
          variant="desktop"
          current_path={@current_path}
        />

        <li class="dropdown dropdown-end hidden md:block">
          <.button
            type="button"
            variant="ghost"
            tabindex="0"
            class="max-w-[14rem] gap-1 font-normal"
            aria-haspopup="menu"
            aria-label={gettext("Account menu")}
          >
            <span class="truncate" title={"User ##{@current_scope.user.id}"}>
              Account
            </span>
            <.icon name="hero-chevron-down" class="size-4 shrink-0 opacity-60" />
          </.button>
          <ul
            tabindex="0"
            class="dropdown-content menu bg-base-200 rounded-box z-[60] w-56 p-2 shadow-lg border border-base-300"
          >
            <li>
              <.link
                navigate={~p"/user/#{@current_scope.user.id}"}
                class={[
                  "rounded-lg text-xs font-normal normal-case max-w-[13rem] truncate",
                  @user_profile_active? && "active"
                ]}
                aria-current={if(@user_profile_active?, do: "page")}
                title={"User ##{@current_scope.user.id}"}
              >
                User #{@current_scope.user.id}
              </.link>
            </li>
            <%= if Storymap.Admin.admin?(@current_scope.user) do %>
              <li>
                <.link
                  href={~p"/admin/users"}
                  class={["rounded-lg", @admin_active? && "active"]}
                  aria-current={if(@admin_active?, do: "page")}
                >
                  Admin
                </.link>
              </li>
              <li>
                <.link
                  href={~p"/admin/reports"}
                  class={["rounded-lg", @admin_reports_active? && "active"]}
                  aria-current={if(@admin_reports_active?, do: "page")}
                >
                  Reports
                </.link>
              </li>
            <% end %>
            <li>
              <.link
                href={~p"/saved"}
                class={["rounded-lg", @saved_active? && "active"]}
                aria-current={if(@saved_active?, do: "page")}
              >
                Saved
              </.link>
            </li>
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
          <.link
            navigate={~p"/user/#{@current_scope.user.id}"}
            class={[
              "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300 text-sm font-medium text-base-content/70 border-t border-base-300 mt-2",
              @user_profile_active? && "bg-base-300 font-medium"
            ]}
            aria-current={if(@user_profile_active?, do: "page")}
          >
            User #{@current_scope.user.id}
          </.link>
        </li>
        <.admin_nav_live_render
          :if={@conn && @current_scope && Storymap.Admin.admin?(@current_scope.user)}
          conn={@conn}
          current_scope={@current_scope}
          variant="mobile"
          current_path={@current_path}
        />

        <%= if Storymap.Admin.admin?(@current_scope.user) do %>
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
            href={~p"/saved"}
            class={[
              "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
              @saved_active? && "bg-base-300 font-medium"
            ]}
            aria-current={if(@saved_active?, do: "page")}
          >
            Saved
          </.link>
        </li>
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
            href={~p"/users/log-in"}
            class={nav_btn_classes(@login_active?)}
            aria-current={if(@login_active?, do: "page")}
          >
            Sign in
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
            Sign in
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
      |> assign(:github_issues_new_url, @github_issues_new)
      |> assign(:privacy_active?, assigns.current_path == "/privacy-policy")
      |> assign(:about_active?, assigns.current_path == "/about")
      |> assign(:vision_active?, assigns.current_path == "/vision")
      |> assign(:help_active?, assigns.current_path == "/help")
      |> assign(:map_page?, map_full_bleed_path?(assigns.current_path))

    footer_link_map_visual =
      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium " <>
        "text-white drop-shadow-md shadow-md hover:shadow-lg transition-shadow transition-opacity hover:opacity-80 " <>
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-0 " <>
        "text-shadow-map-ui " <>
        "bg-black/15"

    footer_link_content_visual =
      "inline-flex items-center justify-center rounded-full px-3 py-1.5 text-sm font-medium " <>
        "text-base-content bg-base-200/80 border border-base-300 " <>
        "hover:bg-base-300 transition-colors " <>
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"

    # pointer-events-auto on links only; nav stays pointer-events-none so gaps
    # and the copyright span pass clicks through to the map.
    footer_link_map = footer_link_map_visual <> " pointer-events-auto"
    footer_link_content = footer_link_content_visual <> " pointer-events-auto"

    footer_link_base =
      if assigns.map_page?, do: footer_link_map, else: footer_link_content

    footer_link_visual =
      if assigns.map_page?, do: footer_link_map_visual, else: footer_link_content_visual

    assigns =
      assigns
      |> assign(:footer_link_base, footer_link_base)
      |> assign(:footer_link_visual, footer_link_visual)
      |> assign(:footer_link_map, footer_link_map)
      |> assign(:footer_link_content, footer_link_content)

    active_classes = "font-semibold underline decoration-2 underline-offset-2"
    assigns = assign(assigns, :footer_active_classes, active_classes)

    ~H"""
    <%!-- z-30: below map React overlays (placement bar, side panel) at z-40 --%>
    <div
      data-desktop-footer
      data-footer-chrome-map={@footer_link_map}
      data-footer-chrome-content={@footer_link_content}
      class={[
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 hidden pb-5 md:flex md:justify-center",
        @map_page? &&
          "md:pl-[calc(var(--map-pin-legend-max-width)+var(--map-pin-legend-inset))]"
      ]}
    >
      <nav
        class="pointer-events-none flex flex-wrap items-center justify-center gap-2 sm:gap-4"
        aria-label="Site links"
      >
        <.link
          navigate={~p"/about"}
          class={[
            @footer_link_base,
            @about_active? && @footer_active_classes
          ]}
          data-footer-nav
          data-footer-path="/about"
          data-footer-active-classes={@footer_active_classes}
          aria-current={if(@about_active?, do: "page")}
        >
          About
        </.link>
        <.link
          navigate={~p"/vision"}
          class={[
            @footer_link_base,
            @vision_active? && @footer_active_classes
          ]}
          data-footer-nav
          data-footer-path="/vision"
          data-footer-active-classes={@footer_active_classes}
          aria-current={if(@vision_active?, do: "page")}
        >
          Vision
        </.link>
        <.link
          navigate={~p"/help"}
          class={[
            @footer_link_base,
            @help_active? && @footer_active_classes
          ]}
          data-footer-nav
          data-footer-path="/help"
          data-footer-active-classes={@footer_active_classes}
          aria-current={if(@help_active?, do: "page")}
        >
          Help
        </.link>
        <a
          href={@github_issues_new_url}
          class={@footer_link_base}
          target="_blank"
          rel="noopener noreferrer"
        >
          Report an issue
        </a>
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
            @privacy_active? && @footer_active_classes
          ]}
          data-footer-nav
          data-footer-path="/privacy-policy"
          data-footer-active-classes={@footer_active_classes}
          aria-current={if(@privacy_active?, do: "page")}
        >
          Privacy Policy
        </.link>
        <span class={[@footer_link_visual, "cursor-default select-none opacity-80"]}>
          © {current_year()} Map Garden
        </span>
      </nav>
    </div>
    """
  end

  @doc "Returns the current UTC year, used for the site-wide copyright footer."
  def current_year, do: Date.utc_today().year

  @doc """
  Small fixed-position copyright shown only on screens narrower than `md`,
  where the desktop floating link bar is hidden. Stays unobtrusive at the
  bottom of the viewport so it's present on every page including the map.
  """
  def mobile_site_copyright(assigns) do
    ~H"""
    <div
      class="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center pb-1 md:hidden"
      aria-hidden="true"
    >
      <span class="rounded-full bg-base-100/80 px-2 py-0.5 text-[11px] text-base-content/70 backdrop-blur-sm select-none shadow-sm">
        © {current_year()} Map Garden
      </span>
    </div>
    """
  end

  @doc "True for map pages that should not have content bottom padding (`md:pb-24`)."
  def map_full_bleed_path?(request_path) when is_binary(request_path) do
    case normalize_request_path_for_layout(request_path) do
      "/" -> true
      "/map" -> true
      "/m/" <> rest -> String.ends_with?(rest, "/map")
      _ -> false
    end
  end

  @doc "Alias for `map_full_bleed_path?/1`."
  def full_viewport_map_path?(request_path), do: map_full_bleed_path?(request_path)

  defp normalize_request_path_for_layout(path) do
    path
    |> String.trim_trailing("/")
    |> case do
      "" -> "/"
      p -> p
    end
  end

  defp nav_btn_classes(active?) do
    [
      "inline-flex items-center justify-center gap-1.5 shrink-0",
      "min-h-9 px-3 rounded-md text-sm font-medium leading-none",
      "border-0 shadow-none bg-transparent text-base-content origin-center cursor-pointer select-none",
      "hover:bg-base-200/80 dark:hover:bg-base-300/60",
      "transition-[background-color,color,transform] duration-150 ease-out",
      "active:scale-[0.9] active:duration-75",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
      "focus-visible:ring-offset-2 focus-visible:ring-offset-base-100",
      active? && "bg-base-200/90 dark:bg-base-300/70"
    ]
  end

  defp user_profile_active?(path, %{user: %{id: id}}), do: path == "/user/#{id}"
  defp user_profile_active?(_, _), do: false

  attr :conn, :map, required: true
  attr :current_scope, :map, required: true
  attr :variant, :string, required: true
  attr :current_path, :string, required: true

  def admin_nav_live_render(assigns) do
    counts = Storymap.AdminPubSub.counts_for_scope(assigns.current_scope)

    assigns = assign(assigns, :admin_nav_counts, counts)

    ~H"""
    {live_render(@conn, StorymapWeb.AdminNavLive,
      id: "admin-nav-#{@variant}",
      container: {:div, class: "contents"},
      session: %{
        "user_id" => @current_scope.user.id,
        "variant" => @variant,
        "current_path" => @current_path,
        "admin_activity_unread_count" => @admin_nav_counts.activity_unread,
        "admin_reports_unresolved_count" => @admin_nav_counts.reports_unresolved
      }
    )}
    """
  end
end
