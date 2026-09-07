import { describe, expect, it } from 'vitest'
import { buildWhatsAppLink } from './whatsapp'

describe('buildWhatsAppLink', () => {
  it('normalizes a leading-zero number to E.164', () => {
    expect(buildWhatsAppLink('081234567890', 'halo')).toBe(
      'https://wa.me/6281234567890?text=halo',
    )
  })

  it('keeps an already-E.164 number unchanged', () => {
    expect(buildWhatsAppLink('6281234567890', 'halo')).toBe(
      'https://wa.me/6281234567890?text=halo',
    )
  })

  it('URL-encodes the message', () => {
    expect(buildWhatsAppLink('6281234567890', 'halo & selamat datang')).toContain(
      'text=halo%20%26%20selamat%20datang',
    )
  })
})
