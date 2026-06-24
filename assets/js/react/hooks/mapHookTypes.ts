import type { Dispatch, MutableRefObject, SetStateAction } from "react"
import type { BuiltinPinType, CustomPinType, Pin, SubMap } from "../types"
import type { FilterState } from "../components/map/filters"
import type { SetCommunityScopeOptions } from "../mapRoute"

export type NavigateToPin = (pinId: number, pins: Pin[]) => Promise<void>

export type UseMapScopeParams = {
  datasetCommunityUrl?: string
}

export type UseMapScopeResult = {
  communityUrl: string | undefined
  setCommunityScope: (url: string | null, options?: SetCommunityScopeOptions) => void
  onSelectWorld: () => void
  onSelectCommunity: (url: string) => void
  initialPinId: number | null
  setInitialPinId: Dispatch<SetStateAction<number | null>>
  pinFocusSeq: number
  navigateToPin: NavigateToPin
  resolvingPinIdsRef: MutableRefObject<Set<number>>
}

export type UseMapDataParams = {
  communityUrl?: string
  setInitialPinId: Dispatch<SetStateAction<number | null>>
  onScopeChange?: () => void
  navigateToPin: NavigateToPin
  resolvingPinIdsRef: MutableRefObject<Set<number>>
  initialPinId: number | null
}

export type UseMapDataResult = {
  pins: Pin[]
  setPins: Dispatch<SetStateAction<Pin[]>>
  subMap: SubMap | null
  setSubMap: Dispatch<SetStateAction<SubMap | null>>
  customPinTypes: CustomPinType[]
  enabledBuiltinTypes: BuiltinPinType[]
  filter: FilterState
  setFilter: Dispatch<SetStateAction<FilterState>>
  loading: boolean
  mapInitialized: boolean
  apiError: string | null
  setApiError: Dispatch<SetStateAction<string | null>>
  updateOrAddPin: (pin: Pin) => void
}
