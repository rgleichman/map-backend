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
         |> assign(:fields, [empty_field()])
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
      PinTypes.change_pin_type(%CustomPinType{}, attrs)
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
        PinTypes.change_pin_type(%CustomPinType{}, attrs)
        |> maybe_add_schema_field_error(field_errors)
        |> Map.put(:action, :validate)

      {:noreply,
       socket
       |> sync_fields(params)
       |> assign(:field_errors, field_errors)
       |> assign(form: to_form(changeset, as: :pin_type))}
    else
      attrs = attrs_from_params(params)

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

  defp assign_form(socket, params) do
    attrs = attrs_from_params(params)
    changeset = PinTypes.change_pin_type(%CustomPinType{}, attrs)
    assign(socket, form: to_form(changeset, as: :pin_type))
  end

  defp attrs_from_params(params) do
    schema = Form.build_schema_from_params(params)

    params
    |> Map.take(["label", "description", "marker_color", "icon", "slug"])
    |> Map.put("schema", schema)
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
