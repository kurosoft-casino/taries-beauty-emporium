export type SupportedCountry = 'Nigeria' | 'Ghana' | 'China' | 'Other'

export const COUNTRY_CALLING_CODES: Record<SupportedCountry, string> = {
  Nigeria: '+234',
  Ghana: '+233',
  China: '+86',
  Other: '+',
}

export function getDialCode(country: SupportedCountry): string {
  return COUNTRY_CALLING_CODES[country]
}

export function getPhonePlaceholder(country: SupportedCountry): string {
  switch (country) {
    case 'Nigeria':
      return '+234 803 000 0000'
    case 'Ghana':
      return '+233 24 000 0000'
    case 'China':
      return '+86 138 0000 0000'
    default:
      return '+123 456 7890'
  }
}

export function withCountryDialCode(phone: string, country: SupportedCountry): string {
  const trimmed = phone.trim()
  const nextCode = getDialCode(country)
  if (!trimmed) return `${nextCode} `

  for (const code of Object.values(COUNTRY_CALLING_CODES)) {
    if (trimmed.startsWith(code)) {
      return `${nextCode}${trimmed.slice(code.length)}`
    }
  }

  return trimmed.startsWith('+') ? trimmed : `${nextCode} ${trimmed}`
}
