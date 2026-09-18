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
  postNote: "Post note",
  addANote: "Add a note…",
  logInToNote: "Log in to note…",
  loadingNotes: "Loading notes…",
  noNotesYet: "No notes yet.",
  cannotPostNotes: "Your account cannot post notes.",
  couldNotPostNote: "Could not post note.",
  deleteThisNote: "Delete this note?",
  reportThisNote: "Report this note",
  reportNotePlaceholder: "What is wrong with this note?",
  mustLogInToNoteOnPlants: " to leave a note on plants.",
  labels: "Labels",
  label: "Label",
  labelsColon: "Labels:",
  searchLabels: "Search labels…",
  addLabel: "Add label…",
  addLabelButton: "Add label",
  removeLabelPrefix: "Remove label:",
  noLabelsOnMapYet: "No labels on the map yet.",
  groundskeeper: "Groundskeeper",
  groundskeepers: "Groundskeepers",
  gardener: "Gardener",
  gardeners: "Gardeners",
  botanicalIllustration: "Botanical illustration",
  gardenTune: "Garden Tune",
  pollinatorPath: "Pollinator Path",
  relatedPlants: "Related plants",
  openPlantToSeePollinatorPath: "Open a plant to see its pollinator path",
  relatedPlantsHint:
    "Search plants on this map, or paste a map link and press Enter (e.g. …/map?pin=89). You can also link plants by pasting a URL in the description or any text field.",
  searchPlantsToLink: "Search plants to link",
  lookingUpPlant: "Looking up plant…",
  noMatchingPlantsOnMap: "No matching plants on this map.",
  cantLinkPlantToItself: "You can't link a plant to itself.",
  plantAlreadyLinked: "That plant is already linked.",
  plantUnavailableToLink: "That plant isn't available to link.",
  couldntFindThatPlant: "Couldn't find that plant.",
} as const

export type GardenCopyKey = keyof typeof GardenCopy

/** Hint when a map URL pin id is ready to link. */
export function pressEnterToLinkPlant(pinId: number): string {
  return `Press Enter to link plant #${pinId}`
}

/** Cap message for explicit related-plant links. */
export function maxLinkedPlantsMessage(max: number): string {
  return `You can link up to ${max} plants.`
}

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

