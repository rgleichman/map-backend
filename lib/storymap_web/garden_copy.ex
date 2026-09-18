defmodule StorymapWeb.GardenCopy do
  @moduledoc """
  Product UI vocabulary (gardening theme). Prefer these helpers over scattering
  the same literals across LiveView templates.

  Keep in sync with `assets/js/react/utils/gardenCopy.ts`.
  """

  @type vocabulary_row :: {String.t(), String.t()}

  @spec plant() :: String.t()
  def plant, do: "Plant"

  @spec plants() :: String.t()
  def plants, do: "Plants"

  @spec plant_bang() :: String.t()
  def plant_bang, do: "Plant!"

  @spec tend_your_plant() :: String.t()
  def tend_your_plant, do: "Tend your Plant"

  @spec uproot() :: String.t()
  def uproot, do: "Uproot"

  @spec save() :: String.t()
  def save, do: "Save"

  @spec take_a_clipping() :: String.t()
  def take_a_clipping, do: "Take a clipping"

  @spec clippings() :: String.t()
  def clippings, do: "Clippings"

  @spec plants_you_have_clipped() :: String.t()
  def plants_you_have_clipped, do: "Plants you have clipped. Only you can see this list."

  @spec not_clipped_anything_yet() :: String.t()
  def not_clipped_anything_yet, do: "You have not taken any clippings yet."

  @spec open_map_and_take_clipping() :: String.t()
  def open_map_and_take_clipping,
    do: "Open a plant on the map and take a clipping to see it here."

  @spec see_all_clippings() :: String.t()
  def see_all_clippings, do: "See all clippings"

  @spec browse_map_to_clip() :: String.t()
  def browse_map_to_clip, do: "to find plants to clip."

  @spec plant_catalogue() :: String.t()
  def plant_catalogue, do: "Plant Catalogue"

  @spec plant_types() :: String.t()
  def plant_types, do: "Plant types"

  @spec create_plant_type() :: String.t()
  def create_plant_type, do: "Create plant type"

  @spec custom_plant_types() :: String.t()
  def custom_plant_types, do: "Custom plant types"

  @spec no_custom_plant_types_yet() :: String.t()
  def no_custom_plant_types_yet, do: "No custom plant types yet."

  @spec delete_this_plant_type() :: String.t()
  def delete_this_plant_type, do: "Delete this plant type?"

  @spec plants_using_type_cannot_delete() :: String.t()
  def plants_using_type_cannot_delete,
    do: "This cannot be undone. Plants using this type cannot be deleted while they exist."

  @spec explore_all_plants() :: String.t()
  def explore_all_plants, do: "Explore all plants on the map, ordered by most recently updated"

  @spec no_plants_yet() :: String.t()
  def no_plants_yet, do: "No plants yet. Be the first to plant one!"

  @spec plants_you_have_created() :: String.t()
  def plants_you_have_created, do: "Plants you have created. Only you can see this list."

  @spec not_planted_anything_yet() :: String.t()
  def not_planted_anything_yet, do: "You have not planted anything yet."

  @spec open_map_and_plant() :: String.t()
  def open_map_and_plant, do: "Open the map and plant to see it here."

  @spec gardens() :: String.t()
  def gardens, do: "Gardens"

  @spec garden() :: String.t()
  def garden, do: "Garden"

  @spec create_a_garden() :: String.t()
  def create_a_garden, do: "Create a garden"

  @spec create_garden() :: String.t()
  def create_garden, do: "Create garden"

  @spec your_gardens() :: String.t()
  def your_gardens, do: "Your gardens"

  @spec search_gardens() :: String.t()
  def search_gardens, do: "Search gardens"

  @spec garden_url() :: String.t()
  def garden_url, do: "Garden URL"

  @spec garden_settings() :: String.t()
  def garden_settings, do: "Garden settings"

  @spec join_garden() :: String.t()
  def join_garden, do: "Join garden"

  @spec leave_garden() :: String.t()
  def leave_garden, do: "Leave garden"

  @spec back_to_garden() :: String.t()
  def back_to_garden, do: "Back to garden"

  @spec browse_gardens() :: String.t()
  def browse_gardens, do: "Browse gardens"

  @spec see_all_gardens() :: String.t()
  def see_all_gardens, do: "See all gardens"

  @spec no_gardens_yet() :: String.t()
  def no_gardens_yet, do: "No gardens yet. Be the first to create one and start mapping together."

  @spec sign_in_to_create_garden() :: String.t()
  def sign_in_to_create_garden, do: "Sign in to create a garden"

  @spec gardens_blurb() :: String.t()
  def gardens_blurb, do: "Curated plant collections with their own rules and groundskeepers."

  @spec not_joined_gardens_yet() :: String.t()
  def not_joined_gardens_yet,
    do: "You have not joined any gardens yet. Only you can see this list."

  @spec search_by_name_or_garden_url() :: String.t()
  def search_by_name_or_garden_url, do: "Search by name or garden URL…"

  @spec who_can_add_plants() :: String.t()
  def who_can_add_plants, do: "Who can add plants?"

  @spec show_plants_on_world_map() :: String.t()
  def show_plants_on_world_map, do: "Show plants on world map"

  @spec groundskeeper() :: String.t()
  def groundskeeper, do: "Groundskeeper"

  @spec groundskeepers() :: String.t()
  def groundskeepers, do: "Groundskeepers"

  @spec groundskeeper_access_required() :: String.t()
  def groundskeeper_access_required, do: "Groundskeeper access required"

  @spec garden_not_found() :: String.t()
  def garden_not_found, do: "Garden not found"

  @spec garden_created() :: String.t()
  def garden_created, do: "Garden created"

  @spec garden_settings_saved() :: String.t()
  def garden_settings_saved, do: "Garden settings saved"

  @spec joined_garden() :: String.t()
  def joined_garden, do: "Joined garden"

  @spec left_garden() :: String.t()
  def left_garden, do: "Left garden"

  @spec garden_owner_access_required() :: String.t()
  def garden_owner_access_required, do: "Garden owner access required"

  @doc "Display label for a membership role atom (wire value unchanged)."
  @spec membership_role_label(atom()) :: String.t()
  def membership_role_label(:moderator), do: groundskeeper()
  def membership_role_label(role) when is_atom(role), do: Atom.to_string(role)

  @spec notes() :: String.t()
  def notes, do: "Notes"

  @spec labels() :: String.t()
  def labels, do: "Labels"

  @spec botanical_illustration() :: String.t()
  def botanical_illustration, do: "Botanical illustration"

  @spec garden_tune() :: String.t()
  def garden_tune, do: "Garden Tune"

  @spec gardener() :: String.t()
  def gardener, do: "Gardener"

  @spec gardeners() :: String.t()
  def gardeners, do: "Gardeners"

  @spec gardener_label(integer()) :: String.t()
  def gardener_label(id) when is_integer(id), do: "#{gardener()} ##{id}"

  @spec gardener_not_found() :: String.t()
  def gardener_not_found, do: "404 - Gardener Not Found"

  @spec gardener_does_not_exist() :: String.t()
  def gardener_does_not_exist, do: "The gardener you are looking for does not exist."

  @spec dramatically_leave_your_plot_behind() :: String.t()
  def dramatically_leave_your_plot_behind, do: "Dramatically leave your plot behind"

  @spec dramatically_leave_your_plot_behind_confirm_title() :: String.t()
  def dramatically_leave_your_plot_behind_confirm_title,
    do: "Dramatically leave your plot behind?"

  @spec delete_account_confirm_body() :: String.t()
  def delete_account_confirm_body,
    do:
      "Are you sure you want to dramatically leave your plot behind? This will delete your account along with all the plants and notes you have created and cannot be undone."

  @spec pollinator_path() :: String.t()
  def pollinator_path, do: "Pollinator Path"

  @spec related_plants() :: String.t()
  def related_plants, do: "Related plants"

  @doc """
  Rows for the Help page vocabulary table: `{familiar_term, garden_term}`.
  """
  @spec vocabulary_rows() :: [vocabulary_row()]
  def vocabulary_rows do
    [
      {"Pins", plants()},
      {"Communities", gardens()},
      {"Search pins", plant_catalogue()},
      {"Create pin", plant_bang()},
      {"Edit pin", tend_your_plant()},
      {"Delete pin", uproot()},
      {"Save pin (to your collection)", take_a_clipping()},
      {"Saved pins", clippings()},
      {"Comments", notes()},
      {"Moderators", groundskeepers()},
      {"Users", gardeners()},
      {"Tags", labels()},
      {"Drawing", botanical_illustration()},
      {"Music", garden_tune()},
      {"Delete account", dramatically_leave_your_plot_behind()},
      {"Connections / pin links", pollinator_path()},
      {"Related pins", related_plants()}
    ]
  end
end
