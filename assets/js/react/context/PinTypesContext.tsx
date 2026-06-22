import React, { createContext, useContext, useMemo } from "react"
import type { BuiltinPinType, CustomPinType } from "../types"
import { BUILTIN_PIN_TYPES } from "../utils/builtinPinType"
import { listSelectablePinTypes } from "../utils/customPinTypes"

type PinTypesContextValue = {
  catalog: CustomPinType[]
  enabledBuiltins: BuiltinPinType[]
  selectableTypes: ReturnType<typeof listSelectablePinTypes>
}

const PinTypesContext = createContext<PinTypesContextValue>({
  catalog: [],
  enabledBuiltins: BUILTIN_PIN_TYPES,
  selectableTypes: BUILTIN_PIN_TYPES,
})

type ProviderProps = {
  catalog: CustomPinType[]
  enabledBuiltins: BuiltinPinType[]
  children: React.ReactNode
}

export function PinTypesProvider({ catalog, enabledBuiltins, children }: ProviderProps) {
  const value = useMemo(
    () => ({
      catalog,
      enabledBuiltins,
      selectableTypes: listSelectablePinTypes(enabledBuiltins, catalog),
    }),
    [catalog, enabledBuiltins]
  )

  return <PinTypesContext.Provider value={value}>{children}</PinTypesContext.Provider>
}

export function usePinTypes(): PinTypesContextValue {
  return useContext(PinTypesContext)
}
