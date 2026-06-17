defmodule StorymapWeb.SubMapComponents do
  @moduledoc false
  use Phoenix.Component

  alias Storymap.SubMaps.PinTypeSettings

  use StorymapWeb, :verified_routes

  attr :settings, :map, required: true
  attr :builtin_types, :list, required: true
  attr :custom_types, :list, required: true

  def pin_type_fields(assigns) do
    ~H"""
    <section class="space-y-6 pt-4 border-t border-base-300" id="community-pin-type-fields">
      <div>
        <h2 class="text-lg font-semibold text-base-content">Pin types</h2>
        <p class="text-sm text-base-content/70 mt-1">
          Choose which pin types members can use in this community. <.link
            navigate={~p"/pin-types"}
            class="link"
          >Browse or create custom types</.link>.
        </p>
      </div>

      <div>
        <h3 class="text-base font-medium text-base-content mb-2">Built-in types</h3>
        <div class="space-y-2">
          <%= for type <- @builtin_types do %>
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="enabled_builtin_pin_types[]"
                value={type}
                checked={type in PinTypeSettings.enabled_builtin_types(@settings)}
                class="checkbox checkbox-sm"
              />
              <span class="text-base-content">{builtin_label(type)}</span>
            </label>
          <% end %>
        </div>
      </div>

      <div>
        <h3 class="text-base font-medium text-base-content mb-2">Custom types</h3>
        <%= if @custom_types == [] do %>
          <p class="text-sm text-base-content/60">No custom pin types exist yet.</p>
        <% else %>
          <div class="space-y-2 max-h-80 overflow-y-auto">
            <%= for pin_type <- @custom_types do %>
              <label class="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled_custom_pin_types[]"
                  value={pin_type.slug}
                  checked={pin_type.slug in PinTypeSettings.enabled_custom_slugs(@settings)}
                  class="checkbox checkbox-sm mt-1"
                />
                <span>
                  <span class="text-base-content font-medium">{pin_type.label}</span>
                  <span class="block font-mono text-xs text-base-content/60">{pin_type.slug}</span>
                </span>
              </label>
            <% end %>
          </div>
        <% end %>
      </div>
    </section>
    """
  end

  defp builtin_label("one_time"), do: "One-time event"
  defp builtin_label("scheduled"), do: "Scheduled recurring"
  defp builtin_label("food_bank"), do: "Food bank"
  defp builtin_label("other"), do: "Other"
  defp builtin_label(type), do: type
end
