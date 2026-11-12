// Express 4 fångar inte fel i async-handlers: ett kastat fel (eller en avvisad promise) når aldrig
// felhanteraren i app.js, och anropet får inget svar. wrap() skickar felet vidare med next(err).
// Används på varje route som gör något async. (Express 5 gör det här själv – vi kör 4.)
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);