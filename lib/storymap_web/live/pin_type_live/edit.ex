defmodule StorymapWeb.PinTypeLive.Edit do
  @moduledoc "Edit a global custom pin type."
  use StorymapWeb, :live_view

  import StorymapWeb.PinTypeLive.FieldsEditor

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType
  alias Storymap.PinTypes.Policy
  alias StorymapWeb.PinTypeLive.Form

  @impl true
  def mount(%{"id" => id}, _session, socket) do
    pin_type = PinTypes.get_pin_type!(id)

    case socket.assigns[:current_scope] do
      %{user: user} ->
        if Policy.can_edit?(user, pin_type) do
          {:ok,
           socket
           |> assign(:page_title, "Edit #{pin_type.label}")
           |> assign(:pin_type, pin_type)
           |> assign(:fields, fields_from_schema(pin_type.schema))
           |> assign(:field_errors, %{})
           |> assign(:show_delete_modal, false)
           |> assign_form(pin_type, %{})}
        else
          {:ok,
           socket
           |> put_flash(:error, "You cannot edit this pin type")
           |> push_navigate(to: ~p"/pin-types")}
        end

      _ ->
        {:ok,
         socket
         |> put_flash(:error, "Log in to edit pin types")
         |> push_navigate(to: ~p"/users/log-in")}
    end
  end

  @impl true
  def handle_event("add_field", _params, socket) do
    {:noreply, assign(socket, :fields, socket.assigns.fields ++ [empty_field()])}
  end

  def handle_event("remove_field", %{"index" => index}, socket) do
    idx = String.to_integer(index)

    fields =
      socket.assigns.fields
      |> Enum.with_index()
      |> Enum.reject(fn {_, i} -> i == idx end)
      |> Enum.map(fn {field, _} -> field end)

    {:noreply, assign(socket, :fields, fields)}
  end

  def handle_event("move_field_up", %{"index" => index}, socket) do
    {:noreply,
     assign(socket, :fields, move_field(socket.assigns.fields, String.to_integer(index), -1))}
  end

  def handle_event("move_field_down", %{"index" => index}, socket) do
    {:noreply,
     assign(socket, :fields, move_field(socket.assigns.fields, String.to_integer(index), 1))}
  end

  def handle_event("validate", %{"pin_type" => params}, socket) do
    field_errors = Form.field_errors_from_params(params)
    attrs = attrs_from_params(params)

    changeset =
      PinTypes.change_pin_type(socket.assigns.pin_type, attrs)
      |> maybe_add_schema_field_error(field_errors)
      |> Map.put(:action, :validate)

    {:noreply,
     socket
     |> sync_fields(params)
     |> assign(:field_errors, field_errors)
     |> assign(form: to_form(changeset, as: :pin_type))}
  end

  def handle_event("save", %{"pin_type" => params}, socket) do
    field_errors = Form.field_errors_from_params(params)

    if field_errors != %{} do
      attrs = attrs_from_params(params)

      changeset =
        PinTypes.change_pin_type(socket.assigns.pin_type, attrs)
        |> maybe_add_schema_field_error(field_errors)
        |> Map.put(:action, :validate)

      {:noreply,
       socket
       |> sync_fields(params)
       |> assign(:field_errors, field_errors)
       |> assign(form: to_form(changeset, as: :pin_type))}
    else
      attrs = attrs_from_params(params)

      case PinTypes.update_pin_type(socket.assigns.current_scope, socket.assigns.pin_type, attrs) do
        {:ok, pin_type} ->
          {:noreply,
           socket
           |> assign(:pin_type, pin_type)
           |> assign(:fields, fields_from_schema(pin_type.schema))
           |> assign(:field_errors, %{})
           |> put_flash(:info, "Pin type saved")
           |> assign_form(pin_type, %{})}

        {:error, :forbidden} ->
          {:noreply, put_flash(socket, :error, "You cannot edit this pin type")}

        {:error, %Ecto.Changeset{} = changeset} ->
          {:noreply,
           socket
           |> sync_fields(params)
           |> assign(:field_errors, field_errors)
           |> assign(form: to_form(changeset, as: :pin_type))}
      end
    end
  end

  def handle_event("show_delete_modal", _params, socket) do
    {:noreply, assign(socket, :show_delete_modal, true)}
  end

  def handle_event("hide_delete_modal", _params, socket) do
    {:noreply, assign(socket, :show_delete_modal, false)}
  end

  def handle_event("delete", _params, socket) do
    case PinTypes.delete_pin_type(socket.assigns.current_scope, socket.assigns.pin_type) do
      {:ok, _} ->
        {:noreply,
         socket
         |> put_flash(:info, "Pin type deleted")
         |> push_navigate(to: ~p"/pin-types")}

      {:error, :in_use} ->
        {:noreply,
         socket
         |> assign(:show_delete_modal, false)
         |> put_flash(:error, "Cannot delete: pins are using this type")}

      {:error, :forbidden} ->
        {:noreply,
         socket
         |> assign(:show_delete_modal, false)
         |> put_flash(:error, "You cannot delete this pin type")}
    end
  end

  defp assign_form(socket, %CustomPinType{} = pin_type, params) do
    attrs = if params == %{}, do: pin_type_to_attrs(pin_type), else: attrs_from_params(params)
    changeset = PinTypes.change_pin_type(pin_type, attrs)
    assign(socket, form: to_form(changeset, as: :pin_type))
  end

  defp pin_type_to_attrs(%CustomPinType{} = pin_type) do
    %{
      "label" => pin_type.label,
      "description" => pin_type.description,
      "marker_color" => pin_type.marker_color,
      "icon" => pin_type.icon,
      "slug" => pin_type.slug,
      "schema" => pin_type.schema
    }
  end

  defp attrs_from_params(params) do
    schema = Form.build_schema_from_params(params)

    params
    |> Map.take(["label", "description", "marker_color", "icon", "slug", "enabled"])
    |> Map.put("schema", schema)
    |> maybe_put_enabled()
  end

  defp maybe_put_enabled(attrs) do
    case Map.get(attrs, "enabled") do
      "true" -> Map.put(attrs, "enabled", true)
      "false" -> Map.put(attrs, "enabled", false)
      _ -> Map.delete(attrs, "enabled")
    end
  end

  defp fields_from_schema(schema) do
    schema
    |> Storymap.PinTypes.Schema.fields()
    |> Enum.map(&field_to_form/1)
    |> case do
      [] -> [empty_field()]
      fields -> fields
    end
  end

  defp field_to_form(%{"key" => key, "label" => label, "type" => type} = field) do
    %{
      "key" => key,
      "label" => label,
      "type" => type,
      "required" => field["required"] in [true, "true"],
      "options" => select_options_to_string(field["options"])
    }
  end

  defp field_to_form(%{key: key, label: label, type: type} = field) do
    field_to_form(%{
      "key" => key,
      "label" => label,
      "type" => type,
      "required" => Map.get(field, :required),
      "options" => Map.get(field, :options)
    })
  end

  defp select_options_to_string(options) when is_list(options) do
    options
    |> Enum.map(fn
      %{"value" => value, "label" => label} when is_binary(value) and is_binary(label) ->
        "#{value} | #{label}"

      %{value: value, label: label} when is_binary(value) and is_binary(label) ->
        "#{value} | #{label}"

      %{"label" => label} ->
        to_string(label)

      %{label: label} ->
        to_string(label)

      label when is_binary(label) ->
        label
    end)
    |> Enum.join("\n")
  end

  defp select_options_to_string(_), do: ""

  defp sync_fields(socket, params) do
    case Form.fields_from_params(params) do
      nil ->
        socket

      fields ->
        fields = Form.merge_field_keys(socket.assigns.fields, fields)

        socket
        |> assign(:fields, fields)
        |> assign(:field_errors, Form.field_errors_from_params(params))
    end
  end

  defp maybe_add_schema_field_error(changeset, field_errors) when field_errors == %{} do
    changeset
  end

  defp maybe_add_schema_field_error(changeset, _field_errors) do
    Ecto.Changeset.add_error(changeset, :schema, "Fix the field errors below")
  end

  defp move_field(fields, index, delta) do
    new_index = index + delta

    if new_index < 0 or new_index >= length(fields) do
      fields
    else
      a = Enum.at(fields, index)
      b = Enum.at(fields, new_index)

      fields
      |> List.replace_at(index, b)
      |> List.replace_at(new_index, a)
    end
  end

  defp empty_field do
    %{"key" => "", "label" => "", "type" => "text", "required" => false, "options" => ""}
  end
end
