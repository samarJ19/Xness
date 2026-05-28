import express, { type Request, type Response } from "express";
import { prismaClient } from "@repo/db";
import { createClient } from "redis";

const router = express.Router();
const redisClient = createClient();
redisClient.connect().catch(console.error);

router.get("/portfolio/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const portfolio = await prismaClient.userStock.findMany({
      where: { userId },
      select: {
        stockSymbol: true,
        quantity: true,
        locked: true
      }
    });
    res.json(portfolio);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
router.get("/orders/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const orders = await prismaClient.order.findMany({
      where: { userId }
    });
    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
});
export default router;