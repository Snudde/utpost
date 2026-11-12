import type { LocationQueryValue } from 'vue-router'

// Efter inloggning: tillbaka dit användaren var på väg (?till=/turer/1/bild), annars startsidan.
// Bara relativa adresser – en "till" som pekar på en annan sajt ignoreras (open redirect):
// "//evil.example" och "https://evil.example" börjar inte med ett ensamt "/".
export const safeRedirect = (
  till: LocationQueryValue | LocationQueryValue[] | undefined,
): string =>
  typeof till === 'string' && till.startsWith('/') && !till.startsWith('//') ? till : '/'
