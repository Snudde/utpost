// M8 (skuld 9): validering av all indata, på ett ställe. validate(schema) kontrollerar req.body
// mot ett Zod-schema (lib/schemas.js) INNAN routen kör, och byter ut req.body mot det validerade
// värdet – med rätt typer och utan okända fält. Ett ogiltigt värde blir ett ZodError, som
// felhanteraren i app.js svarar 400 på: { error: 'ogiltig indata', issues: [...] }.
// Samma sak för query-strängen med validate(schema, 'query').
export const validate =
  (schema, where = 'body') =>
  (req, res, next) => {
    const result = schema.safeParse(req[where]);
    if (!result.success) return next(result.error);
    req[where === 'query' ? 'validQuery' : where] = result.data; // req.query är read-only i Express 4
    next();
  };