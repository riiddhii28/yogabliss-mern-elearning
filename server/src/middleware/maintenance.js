const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// No role bypass. Configure once at startup; changing the flag requires a restart.
export function maintenanceWriteBlock(enabled) {
  return (req, res, next) => {
    if (!enabled || READ_METHODS.has(req.method)) return next();
    res.set("Cache-Control", "no-store");
    return res.status(503).json({
      message: "YogaBliss is temporarily read-only for maintenance.",
    });
  };
}
