export type PinType = "one_time" | "scheduled" | "food_bank"

export type Pin = {
  id: number
  title: string
  latitude: number
  longitude: number
  pin_type: PinType
  description?: string
  icon_url?: string
  is_owner?: boolean
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
}


export type NewPin = {
  title: string
  pin_type: PinType
  description?: string
  latitude: number
  longitude: number
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
}


export type UpdatePin = {
  title: string
  description?: string
  tags: string[]
  start_time?: string // ISO string
  end_time?: string // ISO string
  latitude?: number
  longitude?: number
}

export type GeocodeResult = {
  lat: number
  lng: number
  display_name: string
}


