defmodule StorymapWeb.PinTypeLive.FieldsEditor do
  @moduledoc false
  use Phoenix.Component
  use StorymapWeb, :verified_routes

  import StorymapWeb.CoreComponents

  alias Storymap.Pins.PinTypeColors
  alias Storymap.PinTypes.Icons
  alias Storymap.PinTypes.PinType
  alias StorymapWeb.PinTypeLive.Form

  # Map disc fill when `icon_background_color` is nil (see customPinTypes.ts).
  @default_icon_background "#000000"

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
      <%= if @form[:slug].errors != [] do %>
        <p :for={error <- @form[:slug].errors} class="text-error text-sm" id="pin-type-slug-error">
          Slug {translate_error(error)}
        </p>
      <% end %>
      <.input field={@form[:description]} type="textarea" label="Description" />
      <div>
        <.input
          field={@form[:time_mode]}
          type="select"
          label="Schedule"
          options={PinType.time_mode_options()}
        />
        <p class="text-sm text-base-content/60 mt-1">
          Changing schedule later does not rewrite existing pins until the pin is saved.
        </p>
      </div>

      <.input
        :if={@form[:time_mode].value in [:hours, "hours"]}
        field={@form[:allow_open_24_7]}
        type="checkbox"
        label="Allow pins of this type to be marked open 24/7"
      />

      <% icon_color = preview_icon_color(@form) %>
      <% icon_background = preview_icon_background(@form) %>
      <% preview_icon = @form[:icon].value || "star" %>
      <div class="flex flex-wrap items-start gap-5">
        <div
          id="pin-type-icon-preview"
          class="mt-6 flex size-10 shrink-0 items-center justify-center rounded-full"
          style={"background-color: #{icon_background}; color: #{icon_color}"}
          aria-hidden="true"
        >
          <.pin_glyph name={preview_icon} class="size-6" />
        </div>
        <.color_hex_input
          field={@form[:marker_color]}
          label="Icon color"
          default={icon_color}
          preview_style="color"
        />
        <.color_hex_input
          field={@form[:icon_background_color]}
          label="Icon background"
          default={icon_background}
          preview_style="backgroundColor"
        />
      </div>

      <% selected_icon = @form[:icon].value || "star" %>
      <div class="fieldset mb-2">
        <span class="label mb-1">Icon</span>
        <div
          id="pin-type-icon-picker"
          role="radiogroup"
          aria-label="Icon"
          class="grid grid-cols-4 sm:grid-cols-5 gap-2"
        >
          <%= for {name, icon} <- Icons.all() do %>
            <% selected? = selected_icon == name %>
            <label
              id={"pin-type-icon-#{name}"}
              class={[
                "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2",
                "cursor-pointer origin-center transition-[transform,background-color,border-color]",
                "active:scale-[0.9] focus-within:ring-2 focus-within:ring-primary",
                selected? && "border-primary bg-primary/10 text-primary",
                not selected? &&
                  "border-base-300 text-base-content hover:bg-base-200/60 dark:hover:bg-base-200/40"
              ]}
            >
              <input
                type="radio"
                name={@form[:icon].name}
                value={name}
                checked={selected?}
                class="sr-only"
              />
              <.pin_glyph name={name} class="size-7" />
              <span class="text-[10px] leading-tight text-center truncate w-full">{icon["label"]}</span>
            </label>
          <% end %>
        </div>
        <p :for={error <- @form[:icon].errors} class="text-error text-sm mt-1">
          {translate_error(error)}
        </p>
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

  attr :field, Phoenix.HTML.FormField, required: true
  attr :label, :string, required: true
  attr :default, :string, required: true
  attr :preview_style, :string, required: true, values: ["color", "backgroundColor"]

  def color_hex_input(assigns) do
    field = assigns.field
    errors = Enum.map(field.errors, &translate_error/1)

    assigns =
      assign(assigns,
        errors: errors,
        swatch: hex_swatch_value(field.value, assigns.default),
        text: hex_text_value(field.value)
      )

    ~H"""
    <div
      class="fieldset mb-0 min-w-0"
      id={"pin-type-color-hex-#{@field.field}"}
      phx-hook="ColorHexField"
      data-preview-style={@preview_style}
    >
      <span class="label mb-1">{@label}</span>
      <div class="flex items-center gap-2">
        <input
          type="color"
          id={"#{@field.id}-swatch"}
          value={@swatch}
          aria-label={"Pick #{@label}"}
          phx-update="ignore"
          class={[
            "h-8 w-8 shrink-0 cursor-pointer rounded-md border border-base-300 bg-base-100",
            "p-0 overflow-hidden",
            "[&::-webkit-color-swatch-wrapper]:p-0",
            "[&::-webkit-color-swatch]:border-0 [&::-webkit-color-swatch]:rounded-[0.25rem]",
            "[&::-moz-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-[0.25rem]"
          ]}
        />
        <input
          type="text"
          name={@field.name}
          id={@field.id}
          value={@text}
          placeholder={@default}
          maxlength="7"
          autocomplete="off"
          spellcheck="false"
          aria-label={"#{@label} hex"}
          data-color-hex
          class={[
            "input input-sm font-mono w-[8.5rem]",
            @errors != [] && "input-error"
          ]}
        />
      </div>
      <p :for={msg <- @errors} class="text-error text-sm mt-1">{msg}</p>
    </div>
    """
  end

  @spec preview_icon_color(Phoenix.HTML.Form.t()) :: String.t()
  defp preview_icon_color(form) do
    parsed_hex(form[:marker_color].value) ||
      PinTypeColors.known_color(form[:slug].value) ||
      PinTypeColors.map_fallback_color()
  end

  @spec preview_icon_background(Phoenix.HTML.Form.t()) :: String.t()
  defp preview_icon_background(form) do
    parsed_hex(form[:icon_background_color].value) || @default_icon_background
  end

  @spec hex_swatch_value(term(), String.t()) :: String.t()
  defp hex_swatch_value(value, default), do: parsed_hex(value) || default

  @spec hex_text_value(term()) :: String.t()
  defp hex_text_value(value) when is_binary(value), do: value
  defp hex_text_value(_), do: ""

  @spec parsed_hex(term()) :: String.t() | nil
  defp parsed_hex(value) do
    color = value |> to_string() |> String.trim()

    cond do
      String.match?(color, ~r/^#[0-9A-Fa-f]{6}$/) -> color
      String.match?(color, ~r/^[0-9A-Fa-f]{6}$/) -> "#" <> color
      true -> nil
    end
  end

  attr :name, :string, required: true
  attr :class, :string, default: "size-6"

  def pin_glyph(assigns) do
    icon = Icons.get(assigns.name) || Icons.get("star")
    assigns = assign(assigns, :icon, icon)

    ~H"""
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class={@class} aria-hidden="true">
      <%= if @icon["style"] == "stroke" do %>
        <g
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path
            :for={path <- Enum.flat_map(@icon["layers"], & &1["paths"])}
            d={path["d"]}
          />
        </g>
      <% else %>
        <g
          :for={layer <- @icon["layers"]}
          fill="currentColor"
          fill-opacity={Icons.layer_opacity(layer["gray"])}
        >
          <path
            :for={path <- layer["paths"]}
            d={path["d"]}
            fill-rule={path["fillRule"] || "nonzero"}
          />
        </g>
      <% end %>
    </svg>
    """
  end
end
