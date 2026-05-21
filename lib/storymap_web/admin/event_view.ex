defmodule StorymapWeb.Admin.EventView do
  @moduledoc false
  use StorymapWeb, :html

  def pin_event?(type) when is_binary(type), do: String.starts_with?(type, "pin_")
  def pin_event?(_), do: false

  def format_ts(nil), do: ""

  def format_ts(%DateTime{} = dt) do
    dt
    |> DateTime.shift_zone!("Etc/UTC")
    |> Calendar.strftime("%Y-%m-%d %H:%M:%S UTC")
  end

  def humanize_event_type("pin_created"), do: "Pin created"
  def humanize_event_type("pin_updated"), do: "Pin updated"
  def humanize_event_type("pin_deleted"), do: "Pin deleted"
  def humanize_event_type("content_reported"), do: "Content reported"

  def humanize_event_type(type) when is_binary(type),
    do: String.replace(type, "_", " ") |> String.capitalize()

  def humanize_event_type(_), do: "Event"

  attr :title, :string, required: true
  attr :subtitle, :string, required: true
  attr :count_id, :string, required: true
  attr :count_label, :string, required: true
  attr :count, :integer, required: true
  attr :bulk_button_id, :string, required: true
  attr :bulk_label, :string, required: true
  attr :bulk_event, :string, required: true
  attr :bulk_disabled, :boolean, default: false

  def queue_page_header(assigns) do
    ~H"""
    <header class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div class="min-w-0">
        <h1 class="text-2xl font-semibold tracking-tight">{@title}</h1>
        <p class="text-sm opacity-70 mt-1">{@subtitle}</p>
      </div>
      <div class="flex flex-wrap items-center gap-2 shrink-0">
        <span
          id={@count_id}
          class="badge badge-lg badge-neutral whitespace-nowrap w-fit"
        >
          {@count_label}: {@count}
        </span>
        <button
          id={@bulk_button_id}
          type="button"
          class="btn btn-sm btn-primary whitespace-nowrap"
          phx-click={@bulk_event}
          disabled={@bulk_disabled}
        >
          {@bulk_label}
        </button>
      </div>
    </header>
    """
  end

  @doc """
  Stream list container. `id` must match the LiveView stream name (e.g. `"events"` for `stream(:events, ...)`).
  Item DOM ids are `{id}-{record_id}` (e.g. `events-42`).
  """
  attr :id, :string, required: true
  attr :empty_text, :string, required: true
  attr :stream, :any, required: true

  slot :item, required: true

  def queue_stream(assigns) do
    ~H"""
    <div id={@id} phx-update="stream" phx-hook="LocalTime" class="mt-6 space-y-3">
      <div
        id={"#{@id}-empty"}
        class="hidden only:block rounded-xl border border-dashed border-base-300 p-8 text-center text-sm opacity-70"
      >
        {@empty_text}
      </div>
      <div :for={{dom_id, item} <- @stream} id={dom_id}>
        {render_slot(@item, %{dom_id: dom_id, item: item})}
      </div>
    </div>
    """
  end

  attr :event, :map, required: true
  attr :read?, :boolean, required: true

  def activity_card(assigns) do
    audit? = Map.get(assigns.event, :counts_toward_unread) == false
    show_read? = audit? or assigns.read?

    assigns =
      assigns
      |> assign(:audit?, audit?)
      |> assign(:show_read?, show_read?)

    ~H"""
    <div class={activity_card_classes(@audit?, @show_read?)}>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 min-w-0">
            <div class="font-medium truncate">{humanize_event_type(@event.type)}</div>
            <%= if @audit? do %>
              <span class="badge badge-ghost badge-xs shrink-0">Audit</span>
            <% end %>
          </div>
          <div class="text-sm opacity-80 mt-1">
            <span class="font-mono text-xs opacity-80">#{@event.id}</span>
            <span class="mx-2 opacity-50">·</span>
            <time
              class="admin-local-time"
              data-utc={DateTime.to_iso8601(@event.inserted_at)}
              datetime={DateTime.to_iso8601(@event.inserted_at)}
              title="UTC timestamp"
            >
              {format_ts(@event.inserted_at)}
            </time>
            <%= if @event.actor_user_id do %>
              <span class="mx-2 opacity-50">·</span>
              <span>actor {@event.actor_user_id}</span>
            <% end %>
          </div>
        </div>

        <%= if not @audit? do %>
          <button
            type="button"
            class="btn btn-xs btn-ghost shrink-0"
            phx-click={if(@show_read?, do: "mark_unread", else: "mark_read")}
            phx-value-id={@event.id}
          >
            <%= if @show_read? do %>
              Mark unread
            <% else %>
              Mark read
            <% end %>
          </button>
        <% end %>
      </div>

      <%= if @event.type == "content_reported" do %>
        <.content_reported_summary metadata={@event.metadata} />
      <% else %>
        <%= if pin_event?(@event.type) do %>
          <% title = @event.metadata["title"]
          pin_id_meta = @event.metadata["pin_id"] %>
          <div class="mt-2 text-sm font-medium min-w-0">
            <span
              class="block truncate"
              title={if(is_binary(title) and title != "", do: title, else: nil)}
            >
              <%= cond do %>
                <% is_binary(title) and title != "" -> %>
                  Pin: {title}
                <% pin_id_meta not in [nil, ""] -> %>
                  Pin ##{pin_id_meta}
                <% true -> %>
              <% end %>
            </span>
          </div>
        <% end %>

        <%= if pin_id = @event.metadata["pin_id"] do %>
          <div class="mt-3">
            <.link
              navigate={~p"/map?pin=#{pin_id}"}
              class="link link-primary text-sm inline-flex items-center gap-1"
            >
              <.icon name="hero-map-pin" class="size-4" /> View pin #{pin_id}
            </.link>
          </div>
        <% end %>

        <%= if @event.type == "pin_updated" do %>
          <%= if diff = @event.metadata["diff"] do %>
            <%= if changes = diff["changes"] do %>
              <%= if map_size(changes) > 0 do %>
                <div class="mt-3">
                  <div class="text-xs font-medium opacity-80">Changes</div>
                  <ul class="mt-2 space-y-2 text-xs">
                    <li :for={{field, change} <- Enum.sort_by(changes, fn {k, _v} -> k end)}>
                      <div class="font-mono opacity-70">{field}</div>
                      <div class="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div class="rounded-lg bg-base-200/60 p-2">
                          <div class="opacity-60">from</div>
                          <pre class="whitespace-pre-wrap break-words">{Jason.encode!(change["from"], pretty: true)}</pre>
                        </div>
                        <div class="rounded-lg bg-base-200/60 p-2">
                          <div class="opacity-60">to</div>
                          <pre class="whitespace-pre-wrap break-words">{Jason.encode!(change["to"], pretty: true)}</pre>
                        </div>
                      </div>
                    </li>
                  </ul>
                </div>
              <% end %>
            <% end %>
          <% end %>
        <% end %>

        <%= if @event.metadata != %{} and not pin_event?(@event.type) do %>
          <div class="mt-3 text-sm">
            <pre class="whitespace-pre-wrap break-words rounded-lg bg-base-200/60 p-3 text-xs">{Jason.encode!(@event.metadata, pretty: true)}</pre>
          </div>
        <% end %>
      <% end %>
    </div>
    """
  end

  attr :metadata, :map, required: true

  def content_reported_summary(assigns) do
    ~H"""
    <div class="mt-3 space-y-2 text-sm">
      <%= if pin_id = @metadata["pin_id"] do %>
        <div>
          <.link
            navigate={~p"/map?pin=#{pin_id}"}
            class="link link-primary inline-flex items-center gap-1"
          >
            <.icon name="hero-map-pin" class="size-4" /> View pin #{pin_id}
          </.link>
        </div>
      <% end %>
      <%= if title = @metadata["title"] do %>
        <%= if is_binary(title) and title != "" do %>
          <div class="font-medium truncate" title={title}>Pin: {title}</div>
        <% end %>
      <% end %>
      <%= if category = @metadata["category"] do %>
        <div>
          <span class="opacity-70">Category:</span>
          {humanize_category(category)}
        </div>
      <% end %>
      <%= if report_id = @metadata["report_id"] do %>
        <div class="text-xs opacity-70 font-mono">Report #{report_id}</div>
      <% end %>
    </div>
    """
  end

  attr :report, :map, required: true

  def report_card(assigns) do
    resolved? = not is_nil(assigns.report.resolved_at)
    pin_id = if assigns.report.subject_type == "pin", do: assigns.report.subject_id, else: nil

    assigns =
      assigns
      |> assign(:resolved?, resolved?)
      |> assign(:pin_id, pin_id)

    ~H"""
    <div class={[
      "rounded-xl border p-4 shadow-sm transition-colors",
      @resolved? && "bg-success/10 border-success/30",
      !@resolved? && "bg-base-100 border-base-300"
    ]}>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div class="font-medium">{humanize_category(@report.category)}</div>
          <div class="mt-2 flex flex-col gap-1 text-sm opacity-80 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-2">
            <span class="font-mono text-xs">#{@report.id}</span>
            <span class="hidden sm:inline opacity-50">·</span>
            <time
              class="admin-local-time"
              data-utc={DateTime.to_iso8601(@report.inserted_at)}
              datetime={DateTime.to_iso8601(@report.inserted_at)}
              title="UTC timestamp"
            >
              {format_ts(@report.inserted_at)}
            </time>
            <%= if @report.reporter_user_id do %>
              <span class="hidden sm:inline opacity-50">·</span>
              <span class="truncate">Reporter {@report.reporter_user_id}</span>
            <% end %>
            <span class="hidden sm:inline opacity-50">·</span>
            <%= if @pin_id do %>
              <span class="hidden sm:inline opacity-50">·</span>
              <span class="font-mono text-xs truncate">Pin {@pin_id}</span>
            <% end %>
          </div>
          <%= if is_binary(@report.subject_label) and @report.subject_label != "" do %>
            <p class="mt-2 text-sm font-medium truncate">{@report.subject_label}</p>
          <% end %>
          <%= if is_binary(@report.details) and @report.details != "" do %>
            <p class="mt-2 text-sm whitespace-pre-wrap break-words">{@report.details}</p>
          <% end %>
        </div>

        <div class="flex flex-wrap gap-2 shrink-0">
          <%= if @pin_id do %>
            <.link
              navigate={~p"/map?pin=#{@pin_id}"}
              class="btn btn-xs btn-ghost"
            >
              <.icon name="hero-map-pin" class="size-4" /> View pin
            </.link>
          <% end %>
          <button
            type="button"
            class="btn btn-xs btn-ghost"
            phx-click={if(@resolved?, do: "unresolve", else: "resolve")}
            phx-value-id={@report.id}
          >
            <%= if @resolved? do %>
              Mark unresolved
            <% else %>
              Mark resolved
            <% end %>
          </button>
        </div>
      </div>
    </div>
    """
  end

  defp activity_card_classes(true, _show_read?) do
    [
      "rounded-xl border p-4 shadow-sm transition-colors",
      "bg-base-200/40 border-base-300/60"
    ]
  end

  defp activity_card_classes(false, true) do
    [
      "rounded-xl border p-4 shadow-sm transition-colors",
      "bg-success/10 border-success/30"
    ]
  end

  defp activity_card_classes(false, false) do
    [
      "rounded-xl border p-4 shadow-sm transition-colors",
      "bg-base-100 border-base-300"
    ]
  end

  def humanize_category("abusive_or_hateful"), do: "Abusive or hateful"
  def humanize_category("inaccurate"), do: "Inaccurate"
  def humanize_category("spam"), do: "Spam"
  def humanize_category("other"), do: "Other"
  def humanize_category(other) when is_binary(other), do: other
end
