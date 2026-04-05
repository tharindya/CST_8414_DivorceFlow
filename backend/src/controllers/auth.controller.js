const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already in use" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

    const token = signToken(user);
    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken(user);
    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("_id name email");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, me };