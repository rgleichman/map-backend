defmodule StorymapWeb.AdminNavLive do
  @moduledoc false
  use StorymapWeb, :live_view

  alias Storymap.Accounts
  alias Storymap.Accounts.Scope
  alias Storymap.Admin
  alias Storymap.AdminActivity
  alias Storymap.AdminPubSub
  @impl true
  def mount(_params, session, socket) do
    user_id = session["user_id"]
    variant = session["variant"] || "desktop"
    current_path = session["current_path"] || "/"

    scope =
      case user_id do
        id when is_integer(id) ->
          id |> Accounts.get_user!() |> Scope.for_user()

        _ ->
          Scope.for_user(nil)
      end

    socket = assign(socket, :current_scope, scope)

    counts =
      if Admin.admin_scope?(scope) do
        AdminPubSub.counts_for_scope(scope)
      else
        %{activity_unread: 0, reports_unresolved: 0}
      end

    socket =
      socket
      |> assign(:variant, variant)
      |> assign(:user_id, user_id)
      |> assign(:current_path, current_path)
      |> assign(:activity_unread, counts.activity_unread)
      |> assign(:reports_unresolved, counts.reports_unresolved)
      |> assign(:admin_activity_active?, String.starts_with?(current_path, "/admin/activity"))
      |> assign(:admin_reports_active?, String.starts_with?(current_path, "/admin/reports"))

    if connected?(socket) do
      AdminPubSub.subscribe()
    end

    {:ok, socket}
  end

  @impl true
  def handle_info({:counts_changed, counts}, socket) do
    {:noreply,
     socket
     |> assign(:activity_unread, counts.activity_unread)
     |> assign(:reports_unresolved, counts.reports_unresolved)}
  end

  def handle_info({:activity_reads_changed, admin_user_id}, socket) do
    if socket.assigns.user_id == admin_user_id do
      scope = socket.assigns.current_scope

      {:noreply, assign(socket, :activity_unread, AdminActivity.unread_count(scope))}
    else
      {:noreply, socket}
    end
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def render(assigns) do
    ~H"""
    <%= if @variant == "desktop" do %>
      <.desktop_admin_nav
        activity_unread={@activity_unread}
        reports_unresolved={@reports_unresolved}
        admin_activity_active?={@admin_activity_active?}
        admin_reports_active?={@admin_reports_active?}
      />
    <% else %>
      <.mobile_admin_nav
        activity_unread={@activity_unread}
        reports_unresolved={@reports_unresolved}
        admin_activity_active?={@admin_activity_active?}
        admin_reports_active?={@admin_reports_active?}
      />
    <% end %>
    """
  end

  attr :activity_unread, :integer, required: true
  attr :reports_unresolved, :integer, required: true
  attr :admin_activity_active?, :boolean, required: true
  attr :admin_reports_active?, :boolean, required: true

  defp desktop_admin_nav(assigns) do
    ~H"""
    <li>
      <.link
        navigate={~p"/admin/activity"}
        class={[
          nav_btn_classes(@admin_activity_active?),
          "relative"
        ]}
        aria-current={if(@admin_activity_active?, do: "page")}
        aria-label="Admin activity"
      >
        <.icon name="hero-bell" class="size-5" />
        <span class="sr-only">Activity</span>
        <span
          class={[
            "badge badge-primary badge-sm absolute -top-2 -right-2",
            @activity_unread == 0 && "hidden"
          ]}
          id="admin-activity-unread-badge"
        >
          {@activity_unread}
        </span>
      </.link>
    </li>
    <li>
      <.link
        navigate={~p"/admin/reports"}
        class={[
          nav_btn_classes(@admin_reports_active?),
          "relative"
        ]}
        aria-current={if(@admin_reports_active?, do: "page")}
        aria-label="Admin content reports"
      >
        <.icon name="hero-exclamation-triangle" class="size-5" />
        <span class="sr-only">Reports</span>
        <span
          class={[
            "badge badge-secondary badge-sm absolute -top-2 -right-2",
            @reports_unresolved == 0 && "hidden"
          ]}
          id="admin-reports-unresolved-badge"
        >
          {@reports_unresolved}
        </span>
      </.link>
    </li>
    """
  end

  defp mobile_admin_nav(assigns) do
    ~H"""
    <li>
      <.link
        href={~p"/admin/activity"}
        class={[
          "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
          @admin_activity_active? && "bg-base-300 font-medium"
        ]}
        aria-current={if(@admin_activity_active?, do: "page")}
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <.icon name="hero-bell" class="size-5 opacity-80" />
            <span>Activity</span>
          </div>
          <span
            class={["badge badge-primary badge-sm", @activity_unread == 0 && "hidden"]}
            id="admin-activity-unread-badge-mobile"
          >
            {@activity_unread}
          </span>
        </div>
      </.link>
    </li>
    <li>
      <.link
        href={~p"/admin/reports"}
        class={[
          "block w-full text-left py-3 px-4 drawer-close hover:bg-base-300",
          @admin_reports_active? && "bg-base-300 font-medium"
        ]}
        aria-current={if(@admin_reports_active?, do: "page")}
      >
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2">
            <.icon name="hero-exclamation-triangle" class="size-5 opacity-80" />
            <span>Reports</span>
          </div>
          <span
            class={["badge badge-secondary badge-sm", @reports_unresolved == 0 && "hidden"]}
            id="admin-reports-unresolved-badge-mobile"
          >
            {@reports_unresolved}
          </span>
        </div>
      </.link>
    </li>
    """
  end

  defp nav_btn_classes(active?) do
    ["btn", "btn-ghost", if(active?, do: "btn-active")]
  end
end
