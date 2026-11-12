// Körs före varje testfil. Ger matchers som toBeInTheDocument() och toHaveTextContent().
import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/vue'

// Testing Library städar bara bort det renderade av sig själv när Vitest kör med globals: true –
// det gör vi inte. Utan det här ligger förra testets komponent kvar i DOM:en, och getByRole
// hittar två knappar som heter "Logga in".
afterEach(() => cleanup())
