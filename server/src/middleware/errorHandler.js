// 404 for unmatched routes.
export function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Handles Mongo duplicate keys and cast errors.
export function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  console.error(err);

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ error: `${field} already in use` });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid ${err.path}` });
  }

  if (err.name === "ValidationError") {
    return res.status(422).json({ error: err.message });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status === 500 ? "Internal server error" : err.message,
  });
}
