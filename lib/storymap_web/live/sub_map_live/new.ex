defmodule StorymapWeb.SubMapLive.New do
  @moduledoc "Create a new community."
  use StorymapWeb, :live_view

  on_mount {StorymapWeb.UserAuth, :require_authenticated}
  on_mount {StorymapWeb.UserAuth, :require_not_muted}

  alias Storymap.SubMaps
  alias Storymap.SubMaps.SubMap
  alias StorymapWeb.GardenCopy
  alias StorymapWeb.SubMapLive.PinTypeForm

  @impl true
  def mount(_params, _session, socket) do
    changeset = %SubMap{} |> SubMap.changeset(%{})

    {:ok,
     socket
     |> assign(:page_title, GardenCopy.create_garden())
     |> assign(:form, to_form(changeset, as: :sub_map))
     |> PinTypeForm.assign_pin_types(nil)}
  end

  @impl true
  def handle_event("validate", params, socket) do
    sub_map_params = Map.get(params, "sub_map", %{})

    changeset =
      %SubMap{}
      |> SubMap.changeset(sub_map_params)
      |> Map.put(:action, :validate)

    {:noreply,
     socket
     |> assign(form: to_form(changeset, as: :sub_map))
     |> PinTypeForm.sync_enabled_ids(params)}
  end

  def handle_event("save", params, socket) do
    sub_map_params = Map.get(params, "sub_map", %{})
    attrs = Map.merge(sub_map_params, PinTypeForm.attrs_from(params))

    case SubMaps.create_sub_map(socket.assigns.current_scope, attrs) do
      {:ok, sub_map} ->
        {:noreply,
         socket
         |> put_flash(:info, GardenCopy.garden_created())
         |> push_navigate(to: ~p"/g/#{sub_map.community_url}/map")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply,
         socket
         |> assign(form: to_form(changeset, as: :sub_map))
         |> PinTypeForm.sync_enabled_ids(params)}
    end
  end
end
