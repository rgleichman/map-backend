defmodule StorymapWeb.SubMapLive.Settings do
  @moduledoc "Edit community settings (owner only)."
  use StorymapWeb, :live_view

  alias Storymap.SubMaps
  alias Storymap.SubMaps.SubMap
  alias StorymapWeb.SubMapLive.PinTypeForm

  on_mount {StorymapWeb.SubMapLive.OnMount, :load_sub_map}
  on_mount {StorymapWeb.SubMapLive.OnMount, :require_owner}

  @impl true
  def mount(_params, _session, socket) do
    sub_map = socket.assigns.sub_map
    changeset = SubMap.changeset(sub_map, %{})

    {:ok,
     socket
     |> assign(:page_title, "Settings — #{sub_map.name}")
     |> assign(:form, to_form(changeset, as: :sub_map))
     |> PinTypeForm.assign_pin_types(sub_map.settings || %{})}
  end

  @impl true
  def handle_event("validate", %{"sub_map" => params}, socket) do
    changeset =
      socket.assigns.sub_map
      |> SubMap.changeset(params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, form: to_form(changeset, as: :sub_map))}
  end

  def handle_event("save", params, socket) do
    sub_map = socket.assigns.sub_map
    sub_map_params = Map.get(params, "sub_map", %{})
    pin_type_attrs = PinTypeForm.attrs_from(params)

    case save_settings(socket.assigns.current_scope, sub_map, sub_map_params, pin_type_attrs) do
      {:ok, sub_map} ->
        {:noreply,
         socket
         |> assign(:sub_map, sub_map)
         |> assign(:form, to_form(SubMap.changeset(sub_map, %{}), as: :sub_map))
         |> PinTypeForm.assign_pin_types(sub_map.settings || %{})
         |> put_flash(:info, "Community settings saved")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, form: to_form(changeset, as: :sub_map))}

      {:error, :forbidden} ->
        {:noreply,
         socket
         |> put_flash(:error, "Community owner access required")
         |> push_navigate(to: ~p"/m/#{socket.assigns.sub_map.community_url}/map")}
    end
  end

  defp save_settings(scope, sub_map, sub_map_params, pin_type_attrs) do
    with {:ok, sub_map} <- SubMaps.update_sub_map(scope, sub_map, sub_map_params),
         {:ok, sub_map} <- SubMaps.update_pin_type_settings(scope, sub_map, pin_type_attrs) do
      {:ok, sub_map}
    end
  end
end
