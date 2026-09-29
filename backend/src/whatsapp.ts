// Adapter kirim WhatsApp — pluggable per strategi fase 1 (#29):
// Fonnte (gateway unofficial, murah, populer UMKM) jika FONNTE_TOKEN
// diset; tanpa token = NOOP (bot mati dengan rapi, webhook tetap bisa
// dites lewat respons). BSP resmi (Meta Cloud API) menyusul.

// Normalisasi nomor Indonesia: "0812-345" / "62812345" -> { e164: "62812345", local: "0812345" }.
// Aturan sama dengan waChatLink frontend (0 -> 62).
export function normalizePhone(raw: string): { e164: string; local: string } {
  const digits = raw.replace(/\D/g, "");
  const e164 = digits.replace(/^0/, "62");
  const local = digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
  return { e164, local };
}

export async function sendWhatsApp(
  env: { FONNTE_TOKEN?: string },
  to: string,
  text: string,
): Promise<"sent" | "skipped"> {
  if (!env.FONNTE_TOKEN) return "skipped";

  const res = await fetch("https://api.fonnte.com/send", {
    method: "POST",
    headers: {
      Authorization: env.FONNTE_TOKEN,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target: normalizePhone(to).e164,
      message: text,
    }),
  });
  if (!res.ok) {
    throw new Error(`Fonnte send gagal: ${res.status}`);
  }
  return "sent";
}
