// ✅ Optional middleware (JSON-based, SweetAlert friendly)
function requireLogin(req, res, next) {
  if (!res.locals.currentUser) {
    return res.status(401).json({
      success: false,
      type: "AUTH",
      message: "Please login to create a post."
    });
  }
  next();
}

module.exports = requireLogin;
