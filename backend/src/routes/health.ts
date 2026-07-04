import { Router } from "express";
import { connectMongo, isMongoConnected } from "../db/mongo.js";

export const healthRouter = Router();

healthRouter.get("/", async (_req, res) => {
  await connectMongo();
  res.json({
    status: "ok",
    service: "F.A.R.M.E.R. backend",
    mongodbLoggingConnected: isMongoConnected(),
    timestamp: new Date().toISOString(),
  });
});
