import type { BusinessDto } from '../types/business'
import { api } from './client'

export async function listBusinesses(params?: {
  category?: string
  area?: string
}): Promise<BusinessDto[]> {
  const { data } = await api.get<BusinessDto[]>('/businesses', { params })
  return data
}

export async function getBusiness(slug: string): Promise<BusinessDto> {
  const { data } = await api.get<BusinessDto>(`/businesses/${slug}`)
  return data
}
