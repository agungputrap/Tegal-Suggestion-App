import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BusinessCard } from './BusinessCard'
import type { BusinessDto } from '../types/business'

const openBusiness: BusinessDto = {
  id: 1,
  name: 'Warung Makan Bu Sri',
  slug: 'warung-makan-bu-sri',
  category: 'food',
  subcategory: 'meal',
  description: 'Nasi goreng and soto Tegal.',
  whatsapp: '6281234567890',
  lat: -6.87,
  lng: 109.13,
  area: 'Tegal Barat',
  halal: true,
  photo_path: '',
  is_open: true,
  views: 10,
}

describe('BusinessCard', () => {
  it('renders open status for an open business', () => {
    render(<BusinessCard business={openBusiness} />)
    expect(screen.getByText('Buka hari ini')).toBeInTheDocument()
  })

  it('renders closed status for a closed business', () => {
    render(<BusinessCard business={{ ...openBusiness, is_open: false }} />)
    expect(screen.getByText('Tutup')).toBeInTheDocument()
  })
})
