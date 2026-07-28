import React, { createContext, useContext, useMemo } from "react"
import type { CatalogPinType, PinType } from "../types"
import { listSelectablePinTypes } from "../utils/customPinTypes"

type PinTypesContextValue = {
  /** Catalog rows enabled on the current map. */
  catalog: CatalogPinType[]
  /** Slugs the author can pick, in catalog order. */
  selectableTypes: PinType[]
}

const PinTypesContext = createContext<PinTypesContextValue>({
  catalog: [],
  selectableTypes: [],
})

type ProviderProps = {
  catalog: CatalogPinType[]
  children: React.ReactNode
}

export function PinTypesProvider({ catalog, children }: ProviderProps) {
  const value = useMemo(
    () => ({ catalog, selectableTypes: listSelectablePinTypes(catalog) }),
    [catalog]
  )

  return <PinTypesContext.Provider value={value}>{children}</PinTypesContext.Provider>
}

export function usePinTypes(): PinTypesContextValue {
  return useContext(PinTypesContext)
}
