import "dotenv/config";
import express from "express";
import authRoutes from "./routes/auth.js";
import availabilityRoutes from "./routes/availability.js";
import appointmentRoutes from "./routes/appointments.js";

const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/", availabilityRoutes);
app.use("/appointments", appointmentRoutes);

app.get("/", (req, res) => res.json({ ok: true }));

export default app;
