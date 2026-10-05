export type AfricaZone = 'west' | 'central' | 'east' | 'north' | 'southern'

export interface AfricanCountry {
  name: string
  code: string
  dial: string
  flag: string
  zone: AfricaZone
}

export const AFRICA_ZONE_LABELS: Record<AfricaZone, string> = {
  west: 'West Africa',
  central: 'Central Africa',
  east: 'East Africa',
  north: 'North Africa',
  southern: 'Southern Africa',
}

export const AFRICA_COUNTRIES = [
  { name: 'Algeria', code: 'DZ', dial: '+213', flag: '🇩🇿', zone: 'north' },
  { name: 'Angola', code: 'AO', dial: '+244', flag: '🇦🇴', zone: 'southern' },
  { name: 'Benin', code: 'BJ', dial: '+229', flag: '🇧🇯', zone: 'west' },
  { name: 'Botswana', code: 'BW', dial: '+267', flag: '🇧🇼', zone: 'southern' },
  { name: 'Burkina Faso', code: 'BF', dial: '+226', flag: '🇧🇫', zone: 'west' },
  { name: 'Burundi', code: 'BI', dial: '+257', flag: '🇧🇮', zone: 'east' },
  { name: 'Cabo Verde', code: 'CV', dial: '+238', flag: '🇨🇻', zone: 'west' },
  { name: 'Cameroon', code: 'CM', dial: '+237', flag: '🇨🇲', zone: 'central' },
  { name: 'Central African Republic', code: 'CF', dial: '+236', flag: '🇨🇫', zone: 'central' },
  { name: 'Chad', code: 'TD', dial: '+235', flag: '🇹🇩', zone: 'central' },
  { name: 'Comoros', code: 'KM', dial: '+269', flag: '🇰🇲', zone: 'east' },
  { name: 'Congo (Brazzaville)', code: 'CG', dial: '+242', flag: '🇨🇬', zone: 'central' },
  { name: 'Congo (Kinshasa)', code: 'CD', dial: '+243', flag: '🇨🇩', zone: 'central' },
  { name: 'Côte d’Ivoire', code: 'CI', dial: '+225', flag: '🇨🇮', zone: 'west' },
  { name: 'Djibouti', code: 'DJ', dial: '+253', flag: '🇩🇯', zone: 'east' },
  { name: 'Egypt', code: 'EG', dial: '+20', flag: '🇪🇬', zone: 'north' },
  { name: 'Equatorial Guinea', code: 'GQ', dial: '+240', flag: '🇬🇶', zone: 'central' },
  { name: 'Eritrea', code: 'ER', dial: '+291', flag: '🇪🇷', zone: 'east' },
  { name: 'Eswatini', code: 'SZ', dial: '+268', flag: '🇸🇿', zone: 'southern' },
  { name: 'Ethiopia', code: 'ET', dial: '+251', flag: '🇪🇹', zone: 'east' },
  { name: 'Gabon', code: 'GA', dial: '+241', flag: '🇬🇦', zone: 'central' },
  { name: 'Gambia', code: 'GM', dial: '+220', flag: '🇬🇲', zone: 'west' },
  { name: 'Ghana', code: 'GH', dial: '+233', flag: '🇬🇭', zone: 'west' },
  { name: 'Guinea', code: 'GN', dial: '+224', flag: '🇬🇳', zone: 'west' },
  { name: 'Guinea-Bissau', code: 'GW', dial: '+245', flag: '🇬🇼', zone: 'west' },
  { name: 'Kenya', code: 'KE', dial: '+254', flag: '🇰🇪', zone: 'east' },
  { name: 'Lesotho', code: 'LS', dial: '+266', flag: '🇱🇸', zone: 'southern' },
  { name: 'Liberia', code: 'LR', dial: '+231', flag: '🇱🇷', zone: 'west' },
  { name: 'Libya', code: 'LY', dial: '+218', flag: '🇱🇾', zone: 'north' },
  { name: 'Madagascar', code: 'MG', dial: '+261', flag: '🇲🇬', zone: 'east' },
  { name: 'Malawi', code: 'MW', dial: '+265', flag: '🇲🇼', zone: 'southern' },
  { name: 'Mali', code: 'ML', dial: '+223', flag: '🇲🇱', zone: 'west' },
  { name: 'Mauritania', code: 'MR', dial: '+222', flag: '🇲🇷', zone: 'west' },
  { name: 'Mauritius', code: 'MU', dial: '+230', flag: '🇲🇺', zone: 'east' },
  { name: 'Morocco', code: 'MA', dial: '+212', flag: '🇲🇦', zone: 'north' },
  { name: 'Mozambique', code: 'MZ', dial: '+258', flag: '🇲🇿', zone: 'southern' },
  { name: 'Namibia', code: 'NA', dial: '+264', flag: '🇳🇦', zone: 'southern' },
  { name: 'Niger', code: 'NE', dial: '+227', flag: '🇳🇪', zone: 'west' },
  { name: 'Nigeria', code: 'NG', dial: '+234', flag: '🇳🇬', zone: 'west' },
  { name: 'Rwanda', code: 'RW', dial: '+250', flag: '🇷🇼', zone: 'east' },
  { name: 'São Tomé and Príncipe', code: 'ST', dial: '+239', flag: '🇸🇹', zone: 'central' },
  { name: 'Senegal', code: 'SN', dial: '+221', flag: '🇸🇳', zone: 'west' },
  { name: 'Seychelles', code: 'SC', dial: '+248', flag: '🇸🇨', zone: 'east' },
  { name: 'Sierra Leone', code: 'SL', dial: '+232', flag: '🇸🇱', zone: 'west' },
  { name: 'Somalia', code: 'SO', dial: '+252', flag: '🇸🇴', zone: 'east' },
  { name: 'South Africa', code: 'ZA', dial: '+27', flag: '🇿🇦', zone: 'southern' },
  { name: 'South Sudan', code: 'SS', dial: '+211', flag: '🇸🇸', zone: 'east' },
  { name: 'Sudan', code: 'SD', dial: '+249', flag: '🇸🇩', zone: 'north' },
  { name: 'Tanzania', code: 'TZ', dial: '+255', flag: '🇹🇿', zone: 'east' },
  { name: 'Togo', code: 'TG', dial: '+228', flag: '🇹🇬', zone: 'west' },
  { name: 'Tunisia', code: 'TN', dial: '+216', flag: '🇹🇳', zone: 'north' },
  { name: 'Uganda', code: 'UG', dial: '+256', flag: '🇺🇬', zone: 'east' },
  { name: 'Zambia', code: 'ZM', dial: '+260', flag: '🇿🇲', zone: 'southern' },
  { name: 'Zimbabwe', code: 'ZW', dial: '+263', flag: '🇿🇼', zone: 'southern' },
] as const satisfies readonly AfricanCountry[]

export type AfricanCountryName = (typeof AFRICA_COUNTRIES)[number]['name']
export type SupportedCountry = AfricanCountryName | 'China' | 'Other'

export const AFRICA_COUNTRY_NAMES: string[] = AFRICA_COUNTRIES.map(country => country.name)

const COUNTRY_BY_NAME = new Map<string, AfricanCountry>(AFRICA_COUNTRIES.map(country => [country.name, country]))

export function getAfricanCountry(name: string | null | undefined): AfricanCountry | undefined {
  if (!name) return undefined
  return COUNTRY_BY_NAME.get(String(name).trim())
}

export function isAfricanCountry(name: string | null | undefined): boolean {
  return Boolean(getAfricanCountry(name))
}

export function isSupportedCountry(value: unknown): value is SupportedCountry {
  const name = (value || '').toString().trim()
  return Boolean(COUNTRY_BY_NAME.get(name)) || name === 'China' || name === 'Other'
}

export function normalizeCountryName(value: unknown): SupportedCountry {
  const name = (value || '').toString().trim()
  if (COUNTRY_BY_NAME.has(name)) return name as AfricanCountryName
  if (name === 'China' || name === 'Other') return name
  return 'Other'
}

export interface CountrySelectGroup {
  label: string
  options: string[]
}

export const COUNTRY_SELECT_GROUPS: CountrySelectGroup[] = [
  ...(['west', 'east', 'central', 'north', 'southern'] as AfricaZone[]).map(zone => ({
    label: AFRICA_ZONE_LABELS[zone],
    options: AFRICA_COUNTRIES.filter(country => country.zone === zone).map(country => country.name),
  })),
  { label: 'Other', options: ['China', 'Other'] },
]
