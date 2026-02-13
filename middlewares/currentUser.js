const genz = require("../models/primary/User");

let lastUserId = null; // prevent console spam

module.exports = async function currentUser(req, res, next) {
  try {
    // No session = no user
    if (!req.session || !req.session.userId) {
      res.locals.currentUser = null;
      return next();
    }

    // Fetch user (lean = faster + lighter)
    const user = await genz.findById(req.session.userId).lean();

    // Log only when user changes
    if (user && user._id.toString() !== lastUserId) {
      lastUserId = user._id.toString();
      console.log("👤 LOGGED IN USER:", user.email, "| ROLE:", user.role);
    }

    res.locals.currentUser = user || null;
    next();

  } catch (err) {
    console.error("currentUser middleware error:", err.message);
    res.locals.currentUser = null;
    next();
  }
};
