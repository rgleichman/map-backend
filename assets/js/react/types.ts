export type Pin = {
  id: number
  title: string
  latitude: number
  longitude: number
  description?: string
  icon_url?: string
  user_id?: number
  is_owner?: boolean
}

export type NewPin = {
  title: string
  description?: string
  latitude: number
  longitude: number
}

export type UpdatePin = {
  title: string
  description?: string
}


