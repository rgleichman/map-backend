defmodule StorymapWeb.PinTypeLive.FieldsEditor do
  @moduledoc false
  use Phoenix.Component

  import StorymapWeb.CoreComponents

  alias StorymapWeb.PinTypeLive.Form

  attr :fields, :list, required: true
  attr :field_errors, :map, default: %{}

  def fields_editor(assigns) do
    ~H"""
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-base-content">Fields</h2>
        <p class="text-sm text-base-content/60 mt-1">
          Choose what extra information pins of this type should collect.
        </p>
      </div>

      <%= for {field, index} <- Enum.with_index(@fields) do %>
        <% field_error = Map.get(@field_errors, to_string(index), []) %>
        <% field_type = field["type"] || "text" %>
        <div
          id={"pin-type-field-#{index}"}
          class="rounded-lg border border-base-300 bg-base-200/30 p-4 space-y-3"
        >
          <div class="flex items-center justify-between gap-2">
            <span class="text-sm font-medium text-base-content/70">Field {index + 1}</span>
            <div class="flex items-center gap-1">
              <button
                type="button"
                class={[
                  "btn btn-xs btn-ghost",
                  index == 0 && "btn-disabled pointer-events-none opacity-40"
                ]}
                phx-click="move_field_up"
                phx-value-index={index}
                aria-label="Move field up"
                disabled={index == 0}
              >
                <.icon name="hero-chevron-up" class="w-4 h-4" />
              </button>
              <button
                type="button"
                class={[
                  "btn btn-xs btn-ghost",
                  index == length(@fields) - 1 && "btn-disabled pointer-events-none opacity-40"
                ]}
                phx-click="move_field_down"
                phx-value-index={index}
                aria-label="Move field down"
                disabled={index == length(@fields) - 1}
              >
                <.icon name="hero-chevron-down" class="w-4 h-4" />
              </button>
              <button
                type="button"
                class="btn btn-xs btn-ghost text-error"
                phx-click="remove_field"
                phx-value-index={index}
              >
                Remove
              </button>
            </div>
          </div>

          <input type="hidden" name={"pin_type[fields][#{index}][key]"} value={field["key"]} />

          <div>
            <label class="label"><span class="label-text">Label</span></label>
            <input
              type="text"
              name={"pin_type[fields][#{index}][label]"}
              value={field["label"]}
              class={[
                "input input-bordered w-full",
                field_error != [] && "input-error"
              ]}
            />
            <p :for={msg <- field_error} class="text-error text-sm mt-1">{msg}</p>
          </div>

          <div>
            <label class="label"><span class="label-text">Type</span></label>
            <select
              name={"pin_type[fields][#{index}][type]"}
              class="select select-bordered w-full"
            >
              <%= for type <- Form.field_types() do %>
                <option value={type} selected={field_type == type}>
                  {Form.field_type_label(type)}
                </option>
              <% end %>
            </select>
            <p class="text-sm text-base-content/60 mt-1">{Form.field_type_description(field_type)}</p>
          </div>

          <label class="label cursor-pointer justify-start gap-3">
            <input
              type="checkbox"
              name={"pin_type[fields][#{index}][required]"}
              value="true"
              checked={field["required"] in [true, "true"]}
              class="checkbox checkbox-sm"
            />
            <span class="label-text">Required</span>
          </label>

          <%= if field_type == "select" do %>
            <div>
              <label class="label">
                <span class="label-text">Options (one per line)</span>
              </label>
              <textarea
                name={"pin_type[fields][#{index}][options]"}
                class={[
                  "textarea textarea-bordered w-full",
                  field_error != [] && "textarea-error"
                ]}
                rows="3"
              >{field["options"]}</textarea>
            </div>
          <% end %>
        </div>
      <% end %>

      <button
        type="button"
        class="btn btn-sm btn-ghost"
        phx-click="add_field"
        id="pin-type-add-field"
      >
        Add field
      </button>
    </div>
    """
  end
end
