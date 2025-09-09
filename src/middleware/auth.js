import * as jwt from "jsonwebtoken";
import prisma from "../prisma";

const auth = async (req, res, next) => {
  const header = req.header.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: payload.user.id },
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({});
  }
};

export default auth;
