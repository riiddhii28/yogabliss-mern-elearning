// 404 for unmatched routes.
export function notFound(req, res, next) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` });
}

// Central error handler. Handles Mongo duplicate keys and cast errors.
export function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  // Do not log request bodies, upload credentials or database connection details.
  if (!err.status || err.status >= 500) console.error("Request failed:", err.name || "Error");

  if (err.name === "MulterError") {
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? "Upload too large. Images: 5 MiB maximum; videos: 25 MiB maximum." : "Invalid multipart upload. Send one file in the file field and only the required form fields.",
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({ error: `${field} already in use` });
  }

  if (err.name === "CastError") {
    return res.status(400).json({ error: `Invalid ${err.path}` });
  }

  if (err.name === "ValidationError") {
    return res.status(422).json({ error: "Validation failed", details: Object.keys(err.errors || {}).map((field) => ({ field, message: `Invalid or missing ${field}` })) });
  }

  const status = err.status || 500;
  res.status(status).json({
    error: status >= 500 && ![502, 503].includes(status) ? "Internal server error" : err.message,
  });
}
