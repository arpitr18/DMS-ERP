export function validateBody(schema) {
  return (req, res, next) => {
    req.validatedBody = schema.parse(req.body);
    next();
  };
}
