const PROVIDER_ID_KEY = "jajanjasa:providerId";
const LAST_CHECKIN_KEY = "jajanjasa:lastCheckinDate";

// Catatan: ini penanda identitas sisi klien saja, bukan auth sebenarnya.
// Cukup untuk MVP lomba (satu HP = satu penyedia). Fase 2 perlu OTP WA/SMS
// supaya provider bisa ganti device tanpa kehilangan akun.

export function getStoredProviderId(): string | null {
  return localStorage.getItem(PROVIDER_ID_KEY);
}

export function setStoredProviderId(id: string) {
  localStorage.setItem(PROVIDER_ID_KEY, id);
}

export function clearStoredProvider() {
  localStorage.removeItem(PROVIDER_ID_KEY);
  localStorage.removeItem(LAST_CHECKIN_KEY);
}

export function getLastCheckinDate(): string | null {
  return localStorage.getItem(LAST_CHECKIN_KEY);
}

export function setLastCheckinDate(date: string) {
  localStorage.setItem(LAST_CHECKIN_KEY, date);
}
