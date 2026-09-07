export function buildWhatsAppLink(whatsapp: string, message: string): string {
  const digits = whatsapp.replace(/\D/g, '')
  const normalized = digits.startsWith('0') ? `62${digits.slice(1)}` : digits
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}
