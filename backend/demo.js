const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

module.exports = function demoMiddleware(req, res, next) {
  if (process.env.DEMO_MODE === "true" && WRITE_METHODS.includes(req.method)) {
    return res.json({ ok: true, demo: true });
  }
  next();
};