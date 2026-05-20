defmodule StorymapWeb.AdminLive.Reports do
  use StorymapWeb, :live_view
  use StorymapWeb.AdminLive.Queue

  alias Storymap.ContentReports
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Repo
  import StorymapWeb.Admin.EventView, only: [format_ts: 1, humanize_category: 1]

  @impl true
  def mount(_params, _session, socket) do
    scope = socket.assigns.current_scope

    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)
    unresolved_count = ContentReports.unresolved_count(scope)
    streamed_ids = reports |> Enum.map(& &1.id) |> MapSet.new()

    {:ok,
     socket
     |> assign(:page_title, "Admin · Reports")
     |> assign(:unresolved_count, unresolved_count)
     |> assign(:reports_streamed_ids, streamed_ids)
     |> stream(:reports, reports)
     |> subscribe_admin_pubsub()}
  end

  @impl true
  def handle_info({:report_created, report}, socket) do
    if MapSet.member?(socket.assigns.reports_streamed_ids, report.id) do
      {:noreply, socket}
    else
      report = Repo.preload(report, :reporter)
      scope = socket.assigns.current_scope

      {:noreply,
       socket
       |> assign(
         :reports_streamed_ids,
         MapSet.put(socket.assigns.reports_streamed_ids, report.id)
       )
       |> assign(:unresolved_count, ContentReports.unresolved_count(scope))
       |> stream_insert(:reports, report, at: 0)}
    end
  end

  def handle_info({:report_updated, report}, socket) do
    report = Repo.preload(report, :reporter)
    scope = socket.assigns.current_scope

    {:noreply,
     socket
     |> assign(:unresolved_count, ContentReports.unresolved_count(scope))
     |> stream_insert(:reports, report)}
  end

  def handle_info(:reports_bulk_resolved, socket) do
    scope = socket.assigns.current_scope
    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)
    streamed_ids = reports |> Enum.map(& &1.id) |> MapSet.new()

    {:noreply,
     socket
     |> assign(:unresolved_count, 0)
     |> assign(:reports_streamed_ids, streamed_ids)
     |> stream(:reports, reports, reset: true)}
  end

  def handle_info({:counts_changed, counts}, socket) do
    {:noreply, assign(socket, :unresolved_count, counts.reports_unresolved)}
  end

  def handle_info(_msg, socket), do: {:noreply, socket}

  @impl true
  def handle_event("mark_resolved", %{"id" => id}, socket) do
    case parse_id(id) do
      {:ok, report_id} ->
        scope = socket.assigns.current_scope

        case ContentReports.resolve_report(scope, report_id) do
          {:ok, %ContentReport{} = updated} ->
            updated = Repo.preload(updated, :reporter)

            {:noreply,
             socket
             |> assign(:unresolved_count, ContentReports.unresolved_count(scope))
             |> stream_insert(:reports, updated)}

          {:ok, :noop} ->
            {:noreply, socket}

          {:error, :not_found} ->
            {:noreply, put_flash(socket, :error, "Report not found.")}

          {:error, :unauthorized} ->
            {:noreply, put_flash(socket, :error, "You are not authorized to resolve reports.")}

          {:error, _} ->
            {:noreply, put_flash(socket, :error, "Could not resolve report.")}
        end

      :error ->
        {:noreply, put_flash(socket, :error, "Invalid report id.")}
    end
  end

  @impl true
  def handle_event("mark_unresolved", %{"id" => id}, socket) do
    case parse_id(id) do
      {:ok, report_id} ->
        scope = socket.assigns.current_scope

        case ContentReports.unresolve_report(scope, report_id) do
          {:ok, %ContentReport{} = updated} ->
            updated = Repo.preload(updated, :reporter)

            {:noreply,
             socket
             |> assign(:unresolved_count, ContentReports.unresolved_count(scope))
             |> stream_insert(:reports, updated)}

          {:ok, :noop} ->
            {:noreply, socket}

          {:error, :not_found} ->
            {:noreply, put_flash(socket, :error, "Report not found.")}

          {:error, :unauthorized} ->
            {:noreply, put_flash(socket, :error, "You are not authorized to update reports.")}

          {:error, _} ->
            {:noreply, put_flash(socket, :error, "Could not reopen report.")}
        end

      :error ->
        {:noreply, put_flash(socket, :error, "Invalid report id.")}
    end
  end

  @impl true
  def handle_event("mark_all_resolved", _params, socket) do
    scope = socket.assigns.current_scope

    case ContentReports.mark_all_resolved(scope) do
      :ok ->
        reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)
        streamed_ids = reports |> Enum.map(& &1.id) |> MapSet.new()

        {:noreply,
         socket
         |> assign(:unresolved_count, 0)
         |> assign(:reports_streamed_ids, streamed_ids)
         |> stream(:reports, reports, reset: true)}

      {:error, :unauthorized} ->
        {:noreply, put_flash(socket, :error, "You are not authorized to resolve reports.")}
    end
  end
end
