defmodule StorymapWeb.PinTypeLive.New do
  @moduledoc "Create a global custom pin type."
  use StorymapWeb, :live_view

  on_mount {StorymapWeb.UserAuth, :require_not_muted}

  import StorymapWeb.PinTypeLive.FieldsEditor

  alias Storymap.PinTypes
  alias Storymap.PinTypes.CustomPinType
  alias StorymapWeb.PinTypeLive.Form

  @impl true
  def mount(_params, _session, socket) do
    case socket.assigns[:current_scope] do
      %{user: _} ->
        {:ok,
         socket
         |> assign(:page_title, "Create pin type")
         |> assign(:fields, [Form.empty_field()])
         |> assign(:field_errors, %{})
         |> assign_form(%{})}

      _ ->
        {:ok,
         socket
         |> put_flash(:error, "Log in to create a pin type")
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
      %CustomPinType{}
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
        %CustomPinType{}
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

      case PinTypes.create_pin_type(socket.assigns.current_scope, attrs) do
        {:ok, pin_type} ->
          {:noreply,
           socket
           |> put_flash(:info, "Pin type created")
           |> push_navigate(to: ~p"/pin-types/#{pin_type.id}/edit")}

        {:error, %Ecto.Changeset{} = changeset} ->
          {:noreply,
           socket
           |> sync_fields(params)
           |> assign(:field_errors, field_errors)
           |> assign(form: to_form(changeset, as: :pin_type))}
      end
    end
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

  defp assign_form(socket, params) do
    attrs = Form.attrs_from_params(params)
    changeset = PinTypes.change_pin_type(%CustomPinType{}, attrs)
    assign(socket, form: to_form(changeset, as: :pin_type))
  end
end
