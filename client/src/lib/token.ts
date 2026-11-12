// M8: access token ligger HÄR – i en variabel i minnet – inte i localStorage.
// Allt JavaScript på sidan kan läsa localStorage; det här värdet kan bara den här modulen nå.
// Priset: en omladdning tömmer minnet och loggar ut. Refresh-token i en httpOnly-cookie
// (klipp 1) är nästa steg, inte den här veckans.
let accessToken: string | null = null

export const getToken = () => accessToken
export const setToken = (token: string | null) => {
  accessToken = token
}
