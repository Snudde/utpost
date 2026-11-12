import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
const KEYLEN = 64;
// OWASP Password Storage Cheat Sheet (2025): scrypt med N = 2^17, r = 8, p = 1. Nodes standard är
// N = 2^14 – åtta gånger billigare att gissa mot (24 mot 200 ms per försök på en Mac). Högre N kräver mer minne: maxmem måste rymma 128·N·r byte.
const PARAMS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 };
const hash = (password, salt) => scrypt(password, salt, KEYLEN, PARAMS);

// M8 (A04, Cryptographic Failures): lösenord lagras aldrig – bara ett salt och scrypt-hashen av
// lösenordet + saltet. scrypt finns i Node (inget paket), är gjort för lösenord (långsamt med flit)
// och saltet gör att två användare med samma lösenord får olika hash. Format i databasen:
//   scrypt:<salt hex>:<hash hex>
// Förut stod det `plaintext:hemligt123` i kolumnen password_hash – och API:et skickade raden till klienten.
export const hashPassword = async (password) => {
  const salt = randomBytes(16).toString('hex');
  const derived = await hash(password, salt);
  return `scrypt:${salt}:${derived.toString('hex')}`;
};

// En hash att räkna mot när användaren inte finns eller raden har ett okänt format (gamla
// plaintext-rader): då tar "okänd e-post" lika lång tid som "fel lösenord", och svaret är detsamma.
const DUMMY = await hashPassword('ingen-anvandare');

// Jämförelsen tar lika lång tid oavsett var den första avvikande byten sitter (timingSafeEqual).
// Ett okänt format räknas som fel lösenord – inte som ett krascherande fel – men räknas ändå (DUMMY).
export const verifyPassword = async (password, stored) => {
  let [scheme, salt, hex] = String(stored ?? '').split(':');
  if (scheme !== 'scrypt' || !salt || !hex) [scheme, salt, hex] = DUMMY.split(':');
  const derived = await hash(password, salt);
  const expected = Buffer.from(hex, 'hex');
  return stored !== undefined && String(stored).startsWith('scrypt:') && derived.length === expected.length && timingSafeEqual(derived, expected);
};