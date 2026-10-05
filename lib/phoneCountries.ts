import { AFRICA_COUNTRIES, type SupportedCountry } from './africa'

export type { SupportedCountry } from './africa'

const EXTRA_CALLING_CODES: Record<'China' | 'Other', string> = {
  China: '+86',
  Other: '+',
}

export const COUNTRY_CALLING_CODES: Record<SupportedCountry, string> = (() => {
  const map = {} as Record<SupportedCountry, string>
  for (const country of AFRICA_COUNTRIES) map[country.name] = country.dial
  map.China = EXTRA_CALLING_CODES.China
  map.Other = EXTRA_CALLING_CODES.Other
  return map
})()

const KNOWN_DIAL_CODES = [...new Set(Object.values(COUNTRY_CALLING_CODES))]
  .filter(code => code !== '+')
  .sort((a, b) => b.length - a.length)

export function getDialCode(country: SupportedCountry): string {
  return COUNTRY_CALLING_CODES[country] ?? '+'
}

export function getPhonePlaceholder(country: SupportedCountry): string {
  switch (country) {
    case 'Nigeria':
      return '+234 803 000 0000'
    case 'Ghana':
      return '+233 24 000 0000'
    case 'China':
      return '+86 138 0000 0000'
  }
  const dial = getDialCode(country)
  if (dial === '+') return '+123 456 7890'
  return `${dial} 800 000 0000`
}

export function withCountryDialCode(phone: string, country: SupportedCountry): string {
  const trimmed = phone.trim()
  const nextCode = getDialCode(country)
  if (!trimmed) return `${nextCode} `

  for (const code of KNOWN_DIAL_CODES) {
    if (trimmed.startsWith(code)) {
      return `${nextCode}${trimmed.slice(code.length)}`
    }
  }

  return trimmed.startsWith('+') ? trimmed : `${nextCode} ${trimmed}`
}
