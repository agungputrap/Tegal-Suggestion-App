export interface BusinessDto {
  id: number
  name: string
  slug: string
  category: 'food' | 'service'
  subcategory: string
  description: string
  whatsapp: string
  lat: number
  lng: number
  area: string
  halal: boolean | null
  photo_path: string
  is_open: boolean
  views: number
}

export interface ItemDto {
  id: number
  business_id: number
  name: string
  price: number
  photo_path: string | null
  note: string | null
  available: boolean
}
