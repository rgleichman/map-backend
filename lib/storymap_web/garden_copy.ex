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

  @spec notes() :: String.t()
  def notes, do: "Notes"

  @spec groundskeepers() :: String.t()
  def groundskeepers, do: "Groundskeepers"

  @spec gardeners() :: String.t()
  def gardeners, do: "Gardeners"

  @spec labels() :: String.t()
  def labels, do: "Labels"

  @spec botanical_illustration() :: String.t()
  def botanical_illustration, do: "Botanical illustration"

  @spec garden_tunes() :: String.t()
  def garden_tunes, do: "Garden Tunes"

  @spec pollinator_path() :: String.t()
  def pollinator_path, do: "Pollinator Path"

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
      {"Drawings", botanical_illustration()},
      {"Music", garden_tunes()},
      {"Connections / pin links", pollinator_path()}
    ]
  end
end
