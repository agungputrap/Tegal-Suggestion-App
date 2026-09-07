import { seededBusinesses } from '../lib/seed'
import { BusinessCard } from '../components/BusinessCard'
import { BusinessMap } from '../components/BusinessMap'

export function HomeMap() {
  const businesses = seededBusinesses.filter((b) => b.is_open)

  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="mb-4 text-2xl font-bold">Buka hari ini di Tegal</h1>
      <BusinessMap businesses={businesses} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {businesses.map((business) => (
          <li key={business.id}>
            <BusinessCard business={business} />
          </li>
        ))}
      </ul>
    </main>
  )
}
