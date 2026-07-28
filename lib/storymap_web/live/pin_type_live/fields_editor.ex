defmodule StorymapWeb.PinTypeLive.FieldsEditor do
  @moduledoc false
  use Phoenix.Component
  use StorymapWeb, :verified_routes

  import StorymapWeb.CoreComponents

  alias Storymap.PinTypes.CustomPinType
  alias StorymapWeb.PinTypeLive.Form

  attr :form, Phoenix.HTML.Form, required: true
  attr :fields, :list, required: true
  attr :field_errors, :map, default: %{}
  attr :show_enabled, :boolean, default: false
  attr :show_delete, :boolean, default: false

  def pin_type_form(assigns) do
    ~H"""
    <.form
      for={@form}
      id="pin-type-form"
      phx-change="validate"
      phx-submit="save"
      class="space-y-6"
    >
      <.input field={@form[:label]} type="text" label="Label" required />
      <.input field={@form[:description]} type="textarea" label="Description" />
      <div>
        <.input
          field={@form[:time_mode]}
          type="select"
          label="Schedule"
          options={CustomPinType.time_mode_options()}
        />
        <p class="text-sm text-base-content/60 mt-1">
          Changing schedule later does not rewrite existing pins until the pin is saved.
        </p>
      </div>

      <% marker_color = @form[:marker_color].value || "#6366f1" %>
      <div class="flex items-end gap-3">
        <div class="fieldset mb-2">
          <label>
            <span class="label mb-1">Marker color</span>
            <input
              type="color"
              name={@form[:marker_color].name}
              id={@form[:marker_color].id}
              value={marker_color}
              class="h-10 w-14 cursor-pointer rounded border border-base-300 bg-base-100"
            />
          </label>
        </div>
        <span class="text-sm text-base-content/60 pb-2 font-mono">{marker_color}</span>
      </div>

      <.input
        :if={@show_enabled}
        field={@form[:enabled]}
        type="checkbox"
        label="Enabled (available for new pins)"
      />

      <%= if @form[:schema] && @form[:schema].errors != [] do %>
        <p :for={error <- @form[:schema].errors} class="text-error text-sm">
          {translate_error(error)}
        </p>
      <% end %>

      <.fields_editor fields={@fields} field_errors={@field_errors} />

      <div class="flex flex-wrap gap-3 pt-2">
        <.button type="submit" variant="primary" id="pin-type-save">Save</.button>
        <.button
          :if={@show_delete}
          type="button"
          variant="danger_outline"
          class="inline-flex items-center gap-1.5"
          phx-click="show_delete_modal"
        >
          <.icon name="hero-trash" class="size-4" /> Delete
        </.button>
        <.button navigate={~p"/pin-types"} variant="ghost">Cancel</.button>
      </div>
    </.form>
    """
  end

  attr :fields, :list, required: true
  attr :field_errors, :map, default: %{}

  def fields_editor(assigns) do
    ~H"""
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold text-base-content">Fields</h2>
        <p class="text-sm text-base-content/60 mt-1">
          Choose what extra information pins of this type should have.
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
              <.button
                type="button"
                variant="ghost"
                size="xs"
                phx-click="move_field_up"
                phx-value-index={index}
                aria-label="Move field up"
                disabled={index == 0}
              >
                <.icon name="hero-chevron-up" class="w-4 h-4" />
              </.button>
              <.button
                type="button"
                variant="ghost"
                size="xs"
                phx-click="move_field_down"
                phx-value-index={index}
                aria-label="Move field down"
                disabled={index == length(@fields) - 1}
              >
                <.icon name="hero-chevron-down" class="w-4 h-4" />
              </.button>
              <.button
                type="button"
                variant="ghost"
                size="xs"
                class="text-error"
                phx-click="remove_field"
                phx-value-index={index}
              >
                Remove
              </.button>
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

      <.button type="button" variant="ghost" size="sm" phx-click="add_field" id="pin-type-add-field">
        Add field
      </.button>
    </div>
    """
  end
end
