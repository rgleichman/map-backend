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

  attr :event, :map, required: true
  attr :read?, :boolean, required: true

  def activity_card(assigns) do
    ~H"""
    <div class={[
      "rounded-xl border p-4 shadow-sm transition-colors",
      @read? && "bg-success/10 border-success/30",
      !@read? && "bg-base-100 border-base-300"
    ]}>
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <div class="font-medium truncate">{@event.type}</div>
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

        <button
          type="button"
          class="btn btn-xs btn-ghost"
          phx-click={if(@read?, do: "mark_unread", else: "mark_read")}
          phx-value-id={@event.id}
        >
          <%= if @read? do %>
            Mark unread
          <% else %>
            Mark read
          <% end %>
        </button>
      </div>

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
    </div>
    """
  end

  def humanize_category("abusive_or_hateful"), do: "Abusive or hateful"
  def humanize_category("inaccurate"), do: "Inaccurate"
  def humanize_category("spam"), do: "Spam"
  def humanize_category("other"), do: "Other"
  def humanize_category(other) when is_binary(other), do: other
end
