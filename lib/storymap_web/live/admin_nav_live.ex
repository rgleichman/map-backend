defmodule StorymapWeb.AdminNavLive do
  @moduledoc false
  use StorymapWeb, :live_view

  alias Storymap.Accounts
  alias Storymap.Accounts.Scope
  alias Storymap.AdminPubSub
  alias StorymapWeb.AdminLive.QueueHelpers
  alias StorymapWeb.AdminNavSync

  @impl true
  def mount(_params, session, socket) do
    current_path = session["current_path"] || "/"

    if connected?(socket) do
      AdminPubSub.subscribe()
      Phoenix.PubSub.subscribe(Storymap.PubSub, AdminNavSync.nav_topic())
    end

    {:ok,
     socket
     |> assign(:user_id, session["user_id"])
     |> assign(:variant, session["variant"] || "desktop")
     |> assign(:current_path, current_path)
     |> assign_nav_active(current_path)
     |> assign_counts(session)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <%= if @variant == "desktop" do %>
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
              @admin_activity_unread_count == 0 && "hidden"
            ]}
            id="admin-activity-unread-badge"
          >
            {@admin_activity_unread_count}
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
              @admin_reports_unresolved_count == 0 && "hidden"
            ]}
            id="admin-reports-unresolved-badge"
          >
            {@admin_reports_unresolved_count}
          </span>
        </.link>
      </li>
    <% else %>
      <li>
        <.link
          navigate={~p"/admin/activity"}
          class={[
            "flex items-center gap-2",
            @admin_activity_active? && "active font-semibold"
          ]}
          aria-current={if(@admin_activity_active?, do: "page")}
        >
          <.icon name="hero-bell" class="size-5" /> Activity
          <span
            class={[
              "badge badge-primary badge-sm",
              @admin_activity_unread_count == 0 && "hidden"
            ]}
            id="admin-activity-unread-badge-mobile"
          >
            {@admin_activity_unread_count}
          </span>
        </.link>
      </li>
      <li>
        <.link
          navigate={~p"/admin/reports"}
          class={[
            "flex items-center gap-2",
            @admin_reports_active? && "active font-semibold"
          ]}
          aria-current={if(@admin_reports_active?, do: "page")}
        >
          <.icon name="hero-exclamation-triangle" class="size-5" /> Reports
          <span
            class={[
              "badge badge-secondary badge-sm",
              @admin_reports_unresolved_count == 0 && "hidden"
            ]}
            id="admin-reports-unresolved-badge-mobile"
          >
            {@admin_reports_unresolved_count}
          </span>
        </.link>
      </li>
    <% end %>
    """
  end

  @impl true
  def handle_info({:path_changed, path}, socket) do
    {:noreply,
     socket
     |> assign(:current_path, path)
     |> assign_nav_active(path)}
  end

  def handle_info({:counts_changed, admin_user_id, counts}, socket) do
    socket =
      socket
      |> QueueHelpers.apply_counts_changed(
        admin_user_id,
        counts,
        :admin_activity_unread_count,
        :activity_unread
      )
      |> QueueHelpers.apply_counts_changed(
        admin_user_id,
        counts,
        :admin_reports_unresolved_count,
        :reports_unresolved
      )

    {:noreply, socket}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  defp assign_nav_active(socket, current_path) do
    socket
    |> assign(:admin_activity_active?, String.starts_with?(current_path, "/admin/activity"))
    |> assign(:admin_reports_active?, String.starts_with?(current_path, "/admin/reports"))
  end

  defp assign_counts(socket, session) do
    counts = initial_counts(session)

    socket
    |> assign(:admin_activity_unread_count, counts.activity_unread)
    |> assign(:admin_reports_unresolved_count, counts.reports_unresolved)
  end

  defp initial_counts(%{
         "admin_activity_unread_count" => activity,
         "admin_reports_unresolved_count" => reports
       })
       when is_integer(activity) and activity >= 0 and is_integer(reports) and reports >= 0 do
    %{activity_unread: activity, reports_unresolved: reports}
  end

  defp initial_counts(%{"user_id" => user_id}) when is_integer(user_id) do
    case Accounts.get_user(user_id) do
      nil -> %{activity_unread: 0, reports_unresolved: 0}
      user -> AdminPubSub.counts_for_scope(Scope.for_user(user))
    end
  end

  defp initial_counts(_), do: %{activity_unread: 0, reports_unresolved: 0}

  defp nav_btn_classes(true),
    do: "btn btn-ghost btn-sm btn-square btn-active"

  defp nav_btn_classes(false), do: "btn btn-ghost btn-sm btn-square"
end
