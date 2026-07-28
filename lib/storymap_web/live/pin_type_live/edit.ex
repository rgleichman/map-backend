defmodule StorymapWeb.PinTypeLive.Edit do
  @moduledoc "Edit a global custom pin type."
  use StorymapWeb, :live_view

  import StorymapWeb.PinTypeLive.FieldsEditor

  alias Storymap.PinTypes
  alias Storymap.PinTypes.PinType
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
           |> assign(:fields, Form.fields_from_schema(pin_type.schema))
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
    {:noreply, assign(socket, :fields, Form.add_field(socket.assigns.fields))}
  end

  def handle_event("remove_field", %{"index" => index}, socket) do
    {:noreply,
     assign(socket, :fields, Form.remove_field(socket.assigns.fields, String.to_integer(index)))}
  end

  def handle_event("move_field_up", %{"index" => index}, socket) do
    {:noreply,
     assign(
       socket,
       :fields,
       Form.move_field(socket.assigns.fields, String.to_integer(index), -1)
     )}
  end

  def handle_event("move_field_down", %{"index" => index}, socket) do
    {:noreply,
     assign(socket, :fields, Form.move_field(socket.assigns.fields, String.to_integer(index), 1))}
  end

  def handle_event("validate", %{"pin_type" => params}, socket) do
    field_errors = Form.field_errors_from_params(params)
    attrs = Form.attrs_from_params(params)

    changeset =
      socket.assigns.pin_type
      |> PinTypes.change_pin_type(attrs)
      |> Form.maybe_add_schema_field_error(field_errors)
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
      attrs = Form.attrs_from_params(params)

      changeset =
        socket.assigns.pin_type
        |> PinTypes.change_pin_type(attrs)
        |> Form.maybe_add_schema_field_error(field_errors)
        |> Map.put(:action, :validate)

      {:noreply,
       socket
       |> sync_fields(params)
       |> assign(:field_errors, field_errors)
       |> assign(form: to_form(changeset, as: :pin_type))}
    else
      attrs = Form.attrs_from_params(params)

      case PinTypes.update_pin_type(socket.assigns.current_scope, socket.assigns.pin_type, attrs) do
        {:ok, pin_type} ->
          {:noreply,
           socket
           |> assign(:pin_type, pin_type)
           |> assign(:fields, Form.fields_from_schema(pin_type.schema))
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

      {:error, :system_type} ->
        {:noreply,
         socket
         |> assign(:show_delete_modal, false)
         |> put_flash(:error, "Built-in pin types cannot be deleted")}
    end
  end

  defp assign_form(socket, %PinType{} = pin_type, params) do
    attrs =
      if params == %{}, do: pin_type_to_attrs(pin_type), else: Form.attrs_from_params(params)

    changeset = PinTypes.change_pin_type(pin_type, attrs)
    assign(socket, form: to_form(changeset, as: :pin_type))
  end

  defp pin_type_to_attrs(%PinType{} = pin_type) do
    %{
      "label" => pin_type.label,
      "description" => pin_type.description,
      "marker_color" => pin_type.marker_color,
      "icon" => pin_type.icon,
      "slug" => pin_type.slug,
      "time_mode" => pin_type.time_mode,
      "allow_open_24_7" => pin_type.allow_open_24_7,
      "enabled" => pin_type.enabled,
      "schema" => pin_type.schema
    }
  end

  defp sync_fields(socket, params) do
    case Form.apply_fields_from_params(socket.assigns.fields, params) do
      :unchanged ->
        socket

      {fields, field_errors} ->
        socket
        |> assign(:fields, fields)
        |> assign(:field_errors, field_errors)
    end
  end
end
