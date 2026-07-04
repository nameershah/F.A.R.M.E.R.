import { Router } from "express";
import { isMongoConnected } from "../db/mongo.js";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "F.A.R.M.E.R. backend",
    mongodbLoggingConnected: isMongoConnected(),
    timestamp: new Date().toISOString(),
  });
});
