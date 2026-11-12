import { getToken } from './lib/token'

// Relativ adress: browsern frågar samma server som skickade sidan. I containern är det nginx
// (client/nginx.conf.template), i utveckling Vites dev-server (proxy i vite.config.js). Båda skickar vidare till API:et.
export const API_URL = '/api'

// M8: token följer med i varje anrop när vi har en. Skyddet sitter i API:et (401 utan giltig
// token) – klienten skickar bara med beviset. Ingen cookie, ingen localStorage.
const headers = (extra: Record<string, string> = {}) => {
  const token = getToken()
  return { ...extra, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
}

// Svaret som JSON. Är det inte JSON alls (t.ex. nginx 502-sida i HTML när API:et inte svarar)
// blir det ett fel med statuskoden i stället för "Unexpected token '<'".
const json = async <T>(res: Response): Promise<T> => {
  try {
    return (await res.json()) as T
  } catch {
    throw new Error(`API svarade ${res.status}`)
  }
}

// Generisk: anroparen säger vilken typ svaret har – `get<Guide[]>('/guides')`.
// Typen kommer från @utpost/shared, samma fil som API:et använder.
export const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, { headers: headers() })
  if (!res.ok) throw new Error(`API svarade ${res.status}`)
  return res.json() as Promise<T>
}

// Svarar med JSON även vid 4xx – API:et skickar { error: '...' } då, och anroparen läser det.
// Ta därför med ApiError i typen (post<X | ApiError>) och kolla 'error' in svar.
// Kastar bara när svaret inte är JSON alls.
export const post = async <T>(path: string, body: unknown): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  })
  return json<T>(res)
}

export const del = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers: headers() })
  return json<T>(res)
}
