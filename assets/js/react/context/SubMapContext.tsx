import React, { createContext, useContext, useMemo } from "react"
import type { SubMap } from "../types"
import { canChooseWorldVisibility } from "../utils/subMapForm"

type SubMapContextValue = {
  subMap: SubMap | null
  showPromoteToWorld: boolean
  refreshSubMap: () => Promise<void>
  onJoin: () => Promise<void>
  onLeave: () => Promise<void>
}

const SubMapContext = createContext<SubMapContextValue | null>(null)

type ProviderProps = {
  subMap: SubMap | null
  refreshSubMap: () => Promise<void>
  onJoin: () => Promise<void>
  onLeave: () => Promise<void>
  children: React.ReactNode
}

export function SubMapProvider({ subMap, refreshSubMap, onJoin, onLeave, children }: ProviderProps) {
  const value = useMemo(
    () => ({
      subMap,
      showPromoteToWorld: canChooseWorldVisibility(subMap),
      refreshSubMap,
      onJoin,
      onLeave,
    }),
    [subMap, refreshSubMap, onJoin, onLeave]
  )

  return <SubMapContext.Provider value={value}>{children}</SubMapContext.Provider>
}

export function useSubMap(): SubMapContextValue {
  const ctx = useContext(SubMapContext)
  if (!ctx) {
    return {
      subMap: null,
      showPromoteToWorld: false,
      refreshSubMap: async () => { },
      onJoin: async () => { },
      onLeave: async () => { },
    }
  }
  return ctx
}
