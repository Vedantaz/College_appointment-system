import express from "express";
const router = express.Router();

import { auth } from "../middleware/auth";
import prisma from "prisma";

router.post("/book", auth, async (req, res) => {
  if (req.user.role !== "STUDENT")
    return res.status(403).json({ error: "Only students can book" });
  const { availabilityId } = req.body;
  if (!availabilityId)
    return res.status(400).json({ error: "availabilityId required" });

  try {
    const result = await prisma.$transaction(async (tx) => {
      // try to mark availability booked (only if not booked)
      const updated = await tx.availability.updateMany({
        where: { id: Number(availabilityId), isBooked: false },
        data: { isBooked: true },
      });
      if (updated.count === 0) {
        throw new Error("Slot already booked");
      }
      const avail = await tx.availability.findUnique({
        where: { id: Number(availabilityId) },
      });
      const appt = await tx.appointment.create({
        data: {
          availabilityId: avail.id,
          studentId: req.user.id,
          professorId: avail.professorId,
          status: "BOOKED",
        },
      });
      return appt;
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post("/:id/cancel", auth, async (req, res) => {
  if (req.user.role !== "PROFESSOR")
    return res.status(403).json({ error: "Only professors" });
  const apptId = Number(req.params.id);
  try {
    const result = await prisma.$transaction(async (tx) => {
      // find appointment
      const appt = await tx.appointment.findUnique({ where: { id: apptId } });
      if (!appt) throw new Error("Appointment not found");
      if (appt.professorId !== req.user.id)
        throw new Error("Not your appointment");
      if (appt.status !== "BOOKED") throw new Error("Already cancelled");

      const updatedAppt = await tx.appointment.update({
        where: { id: apptId },
        data: { status: "CANCELLED" },
      });
      await tx.availability.update({
        where: { id: appt.availabilityId },
        data: { isBooked: false },
      });
      return updatedAppt;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/my", auth, async (req, res) => {
  const user = req.user;
  if (user.role === "STUDENT") {
    const appts = await prisma.appointment.findMany({
      where: { studentId: user.id, status: "BOOKED" },
      include: {
        availability: true,
        professor: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json(appts);
  } else {
    const appts = await prisma.appointment.findMany({
      where: { professorId: user.id, status: "BOOKED" },
      include: {
        availability: true,
        student: { select: { id: true, name: true, email: true } },
      },
    });
    return res.json(appts);
  }
});

export default router;
