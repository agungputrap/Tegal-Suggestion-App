const EARTH_RADIUS_KM = 6371;

/**
 * Jarak antar dua titik (km). Dipanggil setelah bounding box filter,
 * jadi jumlah baris yang dihitung sudah kecil -> aman untuk CPU time
 * limit di Workers free tier.
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Bounding box kasar (derajat lat/lng) untuk radius tertentu.
 * Dipakai sebagai filter SQL murah sebelum haversine presisi di kode.
 */
export function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111; // ~111 km per derajat lat
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)) || 1);
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  };
}

export function todayJakarta(): string {
  // WIB = UTC+7, tanpa lib eksternal
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return now.toISOString().slice(0, 10); // YYYY-MM-DD
}
