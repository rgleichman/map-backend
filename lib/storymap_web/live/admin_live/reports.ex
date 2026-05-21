defmodule StorymapWeb.AdminLive.Reports do
  use StorymapWeb, :live_view

  import StorymapWeb.Admin.EventView

  alias Storymap.ContentReports
  alias StorymapWeb.AdminLive.Queue
  alias StorymapWeb.AdminLive.QueueHelpers

  use Queue

  @impl true
  def mount(_params, _session, socket) do
    scope = socket.assigns.current_scope
    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)

    {:ok,
     socket
     |> assign(:page_title, "Content reports")
     |> assign(:unresolved_count, ContentReports.unresolved_count(scope))
     |> stream(:reports, reports, reset: true)
     |> subscribe_admin_pubsub()
     |> sync_admin_nav()}
  end

  @impl true
  def handle_event("resolve", %{"id" => id}, socket) do
    scope = socket.assigns.current_scope

    with {:ok, report_id} <- parse_id(id),
         {:ok, report} <- ContentReports.resolve_report(scope, report_id) do
      {:noreply,
       socket
       |> stream_insert(:reports, report)
       |> assign(:unresolved_count, ContentReports.unresolved_count(scope))}
    else
      _ -> {:noreply, socket}
    end
  end

  def handle_event("unresolve", %{"id" => id}, socket) do
    scope = socket.assigns.current_scope

    with {:ok, report_id} <- parse_id(id),
         {:ok, report} <- ContentReports.unresolve_report(scope, report_id) do
      {:noreply,
       socket
       |> stream_insert(:reports, report)
       |> assign(:unresolved_count, ContentReports.unresolved_count(scope))}
    else
      _ -> {:noreply, socket}
    end
  end

  def handle_event("mark_all_resolved", _params, socket) do
    scope = socket.assigns.current_scope
    :ok = ContentReports.mark_all_resolved(scope)

    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)

    {:noreply,
     socket
     |> stream(:reports, reports, reset: true)
     |> assign(:unresolved_count, ContentReports.unresolved_count(scope))}
  end

  @impl true
  def handle_info({:report_created, report}, socket) do
    {:noreply, stream_insert(socket, :reports, report, at: 0)}
  end

  def handle_info({:report_updated, report}, socket) do
    {:noreply, stream_insert(socket, :reports, report)}
  end

  def handle_info(:reports_bulk_resolved, socket) do
    scope = socket.assigns.current_scope
    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)

    {:noreply,
     socket
     |> stream(:reports, reports, reset: true)
     |> assign(:unresolved_count, ContentReports.unresolved_count(scope))}
  end

  def handle_info({:counts_changed, admin_user_id, counts}, socket) do
    {:noreply,
     QueueHelpers.apply_counts_changed(
       socket,
       admin_user_id,
       counts,
       :unresolved_count,
       :reports_unresolved
     )}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}
end
