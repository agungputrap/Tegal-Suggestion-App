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
  localStorage.removeItem(OWNER_TOKEN_KEY);
  localStorage.removeItem(VERIFY_CODE_KEY);
}

// Owner portal (magic-link /kelola/{token}) — owner_token & verify_code hanya
// dikembalikan server saat registrasi, jadi disimpan agar bisa ditampilkan lagi.
const OWNER_TOKEN_KEY = "jajanjasa:ownerToken";
const VERIFY_CODE_KEY = "jajanjasa:verifyCode";

export function getStoredOwnerToken(): string | null {
  return localStorage.getItem(OWNER_TOKEN_KEY);
}

export function setStoredOwnerToken(token: string) {
  localStorage.setItem(OWNER_TOKEN_KEY, token);
}

export function getStoredVerifyCode(): string | null {
  return localStorage.getItem(VERIFY_CODE_KEY);
}

export function setStoredVerifyCode(code: string) {
  localStorage.setItem(VERIFY_CODE_KEY, code);
}

export function getLastCheckinDate(): string | null {
  return localStorage.getItem(LAST_CHECKIN_KEY);
}

export function setLastCheckinDate(date: string) {
  localStorage.setItem(LAST_CHECKIN_KEY, date);
}
