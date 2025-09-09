import express from "express";
const router = express.Router();

import { auth } from "../middleware/auth";
import prisma from "prisma";

router.post("/availability", auth, async (req, res) => {
  if (req.user.role !== "PROFESSOR")
    return res.status(403).json({ error: "Only professors" });
  const { start, end } = req.body;
  if (!start || !end)
    return res.status(400).json({ error: "start/end required" });
  const slot = await prisma.availability.create({
    data: {
      professorId: req.user.id,
      start: new Date(start),
      end: new Date(end),
    },
  });
  res.status(201).json(slot);
});

router.get("/professors/:id/availability", async (req, res) => {
  const profId = parseInt(req.params.id);
  const slots = await prisma.availability.findMany({
    where: { professorId: profId, isBooked: false },
    orderBy: { start: "asc" },
  });
  res.json(slots);
});

export default router;
