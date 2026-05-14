defmodule StorymapWeb.AdminLive.Reports do
  use StorymapWeb, :live_view

  alias Storymap.ContentReports
  alias Storymap.ContentReports.ContentReport
  alias Storymap.Repo

  @page_size 50

  @impl true
  def mount(_params, _session, socket) do
    scope = socket.assigns.current_scope

    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)
    unresolved_count = ContentReports.unresolved_count(scope)
    streamed_ids = reports |> Enum.map(& &1.id) |> MapSet.new()

    if connected?(socket) do
      Phoenix.PubSub.subscribe(Storymap.PubSub, ContentReports.pubsub_topic())
    end

    {:ok,
     socket
     |> assign(:page_title, "Admin · Reports")
     |> assign(:unresolved_count, unresolved_count)
     |> assign(:reports_streamed_ids, streamed_ids)
     |> stream(:reports, reports)}
  end

  @impl true
  def handle_info({:content_report_created, report}, socket) do
    if MapSet.member?(socket.assigns.reports_streamed_ids, report.id) do
      {:noreply, socket}
    else
      report = Repo.preload(report, :reporter)

      socket =
        socket
        |> assign(
          :reports_streamed_ids,
          MapSet.put(socket.assigns.reports_streamed_ids, report.id)
        )
        |> assign(:unresolved_count, socket.assigns.unresolved_count + 1)
        |> stream_insert(:reports, report, at: 0)

      {:noreply, socket}
    end
  end

  @impl true
  def handle_info({:content_report_updated, report}, socket) do
    report = Repo.preload(report, :reporter)
    scope = socket.assigns.current_scope

    {:noreply,
     socket
     |> assign(:unresolved_count, ContentReports.unresolved_count(scope))
     |> stream_insert(:reports, report)}
  end

  @impl true
  def handle_info({:content_reports_bulk_resolved, _}, socket) do
    scope = socket.assigns.current_scope
    reports = ContentReports.list_reports_for_admin(scope, limit: @page_size)
    streamed_ids = reports |> Enum.map(& &1.id) |> MapSet.new()

    {:noreply,
     socket
     |> assign(:unresolved_count, 0)
     |> assign(:reports_streamed_ids, streamed_ids)
     |> stream(:reports, reports, reset: true)}
  end

  @impl true
  def handle_event("mark_resolved", %{"id" => id}, socket) do
    case parse_report_id(id) do
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
    case parse_report_id(id) do
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

  @impl true
  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash} current_scope={@current_scope}>
      <div class="px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Content reports</h1>
            <p class="text-sm opacity-80 mt-1">
              Pins reported as inaccurate, abusive, or otherwise problematic.
            </p>
          </div>

          <div class="flex items-center gap-2">
            <div class="badge badge-neutral">
              Unresolved: {@unresolved_count}
            </div>
            <button
              id="admin-reports-mark-all-resolved"
              type="button"
              class="btn btn-sm btn-ghost"
              phx-click="mark_all_resolved"
              disabled={@unresolved_count == 0}
            >
              Mark all resolved
            </button>
          </div>
        </div>

        <div class="mt-6">
          <div id="admin-reports-list" phx-update="stream" class="space-y-3">
            <div id="admin-reports-empty" class="hidden only:block opacity-70">
              No reports yet.
            </div>

            <div :for={{id, report} <- @streams.reports} id={id}>
              <% resolved? = report.resolved_at != nil %>
              <div class={[
                "rounded-xl border p-4 shadow-sm transition-colors",
                resolved? && "bg-success/10 border-success/30",
                !resolved? && "bg-base-100 border-base-300"
              ]}>
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <div class="font-medium truncate">
                      {humanize_category(report.category)}
                    </div>
                    <div class="text-sm opacity-80 mt-1">
                      <span class="font-mono text-xs opacity-80">
                        ##{report.id}
                      </span>
                      <span class="mx-2 opacity-50">·</span>
                      <time
                        class="admin-local-time"
                        data-utc={DateTime.to_iso8601(report.inserted_at)}
                        datetime={DateTime.to_iso8601(report.inserted_at)}
                        title="UTC timestamp"
                      >
                        {format_ts(report.inserted_at)}
                      </time>
                      <span class="mx-2 opacity-50">·</span>
                      <span>Pin #{report.subject_id}</span>
                      <%= if report.subject_label && report.subject_label != "" do %>
                        <span class="mx-2 opacity-50">·</span>
                        <span
                          class="truncate inline-block max-w-[12rem] align-bottom"
                          title={report.subject_label}
                        >
                          {report.subject_label}
                        </span>
                      <% end %>
                      <span class="mx-2 opacity-50">·</span>
                      <%= if report.reporter_user_id do %>
                        <span>Reporter user #{report.reporter_user_id}</span>
                      <% else %>
                        <span>Anonymous</span>
                      <% end %>
                    </div>
                    <%= if report.details && report.details != "" do %>
                      <p class="mt-2 text-sm whitespace-pre-wrap break-words">{report.details}</p>
                    <% end %>
                    <div class="mt-3">
                      <.link
                        navigate={~p"/map?pin=#{report.subject_id}"}
                        class="link link-primary text-sm inline-flex items-center gap-1"
                      >
                        <.icon name="hero-map-pin" class="size-4" /> View pin #{report.subject_id}
                      </.link>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn btn-xs btn-ghost shrink-0"
                    phx-click={if(resolved?, do: "mark_unresolved", else: "mark_resolved")}
                    phx-value-id={report.id}
                  >
                    <%= if resolved? do %>
                      Mark unresolved
                    <% else %>
                      Mark resolved
                    <% end %>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layouts.app>
    """
  end

  defp humanize_category("abusive_or_hateful"), do: "Abusive or hateful"
  defp humanize_category("inaccurate"), do: "Inaccurate"
  defp humanize_category("spam"), do: "Spam"
  defp humanize_category("other"), do: "Other"
  defp humanize_category(other) when is_binary(other), do: other

  defp format_ts(nil), do: ""

  defp format_ts(%DateTime{} = dt) do
    dt
    |> DateTime.shift_zone!("Etc/UTC")
    |> Calendar.strftime("%Y-%m-%d %H:%M:%S UTC")
  end

  defp parse_report_id(id) when is_binary(id) do
    case Integer.parse(id) do
      {report_id, ""} -> {:ok, report_id}
      _ -> :error
    end
  end

  defp parse_report_id(id) when is_integer(id), do: {:ok, id}
  defp parse_report_id(_), do: :error
end
