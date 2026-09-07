import type { BusinessDto } from '../types/business'

interface BusinessCardProps {
  business: BusinessDto
}

export function BusinessCard({ business }: BusinessCardProps) {
  return (
    <article className="rounded-lg border border-gray-200 p-4 shadow-sm">
      <h3 className="text-lg font-semibold">{business.name}</h3>
      <p className="text-sm text-gray-500">{business.subcategory}</p>
      <p className="mt-2 text-sm text-gray-700">{business.description}</p>
      <span
        className={`mt-3 inline-block rounded-full px-2 py-1 text-xs font-medium ${
          business.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {business.is_open ? 'Buka hari ini' : 'Tutup'}
      </span>
    </article>
  )
}
