/**
 * Product UI vocabulary (gardening theme). Prefer these constants over scattering
 * the same literals across components. Collection-save only: `takeAClipping`.
 * Form persist: `plantBang` (create) / `save` (edit).
 */
export const GardenCopy = {
  plant: "Plant",
  plants: "Plants",
  plantBang: "Plant!",
  tendYourPlant: "Tend your Plant",
  uproot: "Uproot",
  save: "Save",
  saving: "Saving…",
  planting: "Planting…",
  takeAClipping: "Take a clipping",
  clippings: "Clippings",
  clippingsOnly: "Clippings only",
  clipped: "Clipped",
  removeFromClippings: "Remove from clippings",
  noClippingsOnMap: "No clippings on this map —",
  viewAllClippings: "view all",
  logInToTakeClipping: " to take a clipping.",
  couldNotLoadClippings: "Could not load clippings.",
  couldNotUpdateClipping: "Could not update clipping.",
  myPlants: "My plants",
  plantCatalogue: "Plant Catalogue",
  plantType: "Plant type",
  plantTypes: "Plant types",
  plantTypesTitle: "Plant Types",
  choosePlantType: "Choose plant type",
  plantDetails: "Plant details",
  closePlantDetails: "Close plant details",
  showPlantTypesLegend: "Show plant types legend",
  addOrEditPlantTypes: "Add or Edit plant types",
  whatTypeOfPlant: "What type of plant is this?",
  reportPlant: "Report plant",
  reportThisPlant: "Report this plant",
  reportPlantPlaceholder: "What is wrong with this plant?",
  uprootConfirmTitle: "Uproot this plant?",
  nearLocationTitle: "This plant is near your location",
  nearLocationBody:
    "Posting here may reveal where you are right now. Move the plant first, or post anyway.",
  mutedCannotEditPlants: "Your account is muted and cannot add or edit plants.",
  mustJoinBeforeAddingPlants: "You must join this garden before adding plants.",
  noPlantTypesEnabled:
    "No plant types are enabled for this map. Garden groundskeepers can enable types in settings, or create types on the plant types page.",
  gardens: "Gardens",
  garden: "Garden",
  createAGarden: "Create a garden",
  createGarden: "Create garden",
  yourGardens: "Your gardens",
  searchGardens: "Search gardens",
  gardenUrl: "Garden URL",
  gardenSettings: "Garden settings",
  gardenMap: "Garden map",
  joinGarden: "Join garden",
  leaveGarden: "Leave garden",
  backToGarden: "Back to garden",
  browseGardens: "Browse gardens",
  seeAllGardens: "See all gardens",
  noGardensYet: "No gardens yet. Be the first to create one and start mapping together.",
  signInToCreateGarden: "Sign in to create a garden",
  gardensBlurb: "Community plots with their own rules and groundskeepers.",
  notJoinedGardensYet: "You have not joined any gardens yet. Only you can see this list.",
  searchByNameOrGardenUrl: "Search by name or garden URL…",
  whoCanAddPlants: "Who can add plants?",
  showPlantsOnWorldMap: "Show plants on world map",
  visibleOnWorldAndGarden: "Visible on the main world map as well as this garden.",
  notes: "Notes",
  groundskeeper: "Groundskeeper",
  groundskeepers: "Groundskeepers",
  gardener: "Gardener",
  gardeners: "Gardeners",
  labels: "Labels",
  label: "Label",
  botanicalIllustration: "Botanical illustration",
  gardenTunes: "Garden Tunes",
  pollinatorPath: "Pollinator Path",
  relatedPlants: "Related plants",
} as const

export type GardenCopyKey = keyof typeof GardenCopy

export type PinOverlayMode = "select-type" | "view" | "edit" | "add" | string | undefined

/** Aria / overlay title for pin workflow modes. */
export function pinOverlayTitle(mode: PinOverlayMode): string {
  switch (mode) {
    case "select-type":
      return GardenCopy.choosePlantType
    case "view":
      return GardenCopy.plantDetails
    case "edit":
      return GardenCopy.tendYourPlant
    case "add":
      return GardenCopy.plantBang
    default:
      return GardenCopy.plant
  }
}

/** Create vs edit modal heading. */
export function plantFormHeading(mode: "add" | "edit"): string {
  return mode === "edit" ? GardenCopy.tendYourPlant : GardenCopy.plantBang
}

/** Create vs edit form primary button (not collection-save). */
export function plantFormPrimaryLabel(mode: "add" | "edit", saving: boolean): string {
  if (saving) {
    return mode === "edit" ? GardenCopy.saving : GardenCopy.planting
  }
  return mode === "edit" ? GardenCopy.save : GardenCopy.plantBang
}

/** Heart / collection button label and aria. */
export function clippingButtonLabel(hearted: boolean): string {
  return hearted ? GardenCopy.clipped : GardenCopy.takeAClipping
}

export function clippingButtonAriaLabel(hearted: boolean): string {
  return hearted ? GardenCopy.removeFromClippings : GardenCopy.takeAClipping
}

