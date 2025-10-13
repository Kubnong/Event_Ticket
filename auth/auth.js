const jwt = require("jsonwebtoken");
const User = require("../model/user");

async function authMiddleware(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.redirect("/signin");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    req.user = user;
    next();
  } catch (err) {
    return res.redirect("/signin");
  }
}

module.exports = authMiddleware;