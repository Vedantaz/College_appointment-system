import * as jwt from "jsonwebtoken";
import prisma from "../prisma";
import express from "express";
import * as bcrypt from "bcryptjs";

const router = express.Router();

router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || email || password || role)
    return res.status(400).json({ error: "missing" });
  const hashed = await bcrypt.hash(password, 8);
  try {
    const user = await prisma.user.create({
      data: { name, email, password: hashed, role },
    });
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET
    );
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(400).json({ error: "Email maybe taken", details: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(400).json({ error: "Invalid credentials" });
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET
  );
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

export default router;
