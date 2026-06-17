defmodule StorymapWeb.SubMapLive.New do
  @moduledoc "Create a new community."
  use StorymapWeb, :live_view

  alias Storymap.SubMaps
  alias Storymap.SubMaps.{PinTypeSettings, SubMap}
  alias StorymapWeb.SubMapLive.PinTypeForm

  @impl true
  def mount(_params, _session, socket) do
    changeset =
      %SubMap{}
      |> SubMap.changeset(%{
        "contribution_mode" => "open",
        "promote_to_world_default" => "ask",
        "visibility" => "public"
      })

    {:ok,
     socket
     |> assign(:page_title, "Create community")
     |> assign(:form, to_form(changeset, as: :sub_map))
     |> PinTypeForm.assign_pin_types(%{})}
  end

  @impl true
  def handle_event("validate", %{"sub_map" => params}, socket) do
    changeset =
      %SubMap{}
      |> SubMap.changeset(params)
      |> Map.put(:action, :validate)

    {:noreply, assign(socket, form: to_form(changeset, as: :sub_map))}
  end

  def handle_event("save", params, socket) do
    sub_map_params = Map.get(params, "sub_map", %{})
    pin_type_attrs = PinTypeForm.attrs_from(params)

    settings = PinTypeSettings.merge_pin_type_settings(%{}, pin_type_attrs)
    attrs = Map.put(sub_map_params, "settings", settings)

    case SubMaps.create_sub_map(socket.assigns.current_scope, attrs) do
      {:ok, sub_map} ->
        {:noreply,
         socket
         |> put_flash(:info, "Community created")
         |> push_navigate(to: ~p"/m/#{sub_map.community_url}/map")}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, form: to_form(changeset, as: :sub_map))}
    end
  end
end
