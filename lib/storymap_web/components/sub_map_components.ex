defmodule StorymapWeb.SubMapComponents do
  @moduledoc false
  use Phoenix.Component

  use StorymapWeb, :verified_routes

  attr :pin_types, :list, required: true
  attr :enabled_pin_type_ids, :list, default: []

  def pin_type_fields(assigns) do
    ~H"""
    <section class="space-y-4 pt-4 border-t border-base-300" id="community-pin-type-fields">
      <div>
        <h2 class="text-lg font-semibold text-base-content">Pin types</h2>
        <p class="text-sm text-base-content/70 mt-1">
          Choose which pin types members can use in this community. <.link
            navigate={~p"/pin-types"}
            class="link"
          >Browse or create pin types</.link>.
        </p>
      </div>

      <%= if @pin_types == [] do %>
        <p class="text-sm text-base-content/60">No pin types exist yet.</p>
      <% else %>
        <div class="space-y-2 max-h-80 overflow-y-auto">
          <%= for pin_type <- @pin_types do %>
            <label class="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="enabled_pin_type_ids[]"
                value={pin_type.id}
                checked={pin_type.id in @enabled_pin_type_ids}
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
    </section>
    """
  end
end
