import express, { type Request, type Response } from "express";
import { OrderInputSchema } from "../utils/zod";
import { prismaClient } from "@repo/db";
import { createClient } from "redis";

const router = express.Router();
const redisClient = createClient();
redisClient.connect().catch(console.error);

router.post("/placeorder", async (req: Request, res: Response) => {
  try {
    const bodyFromClient = await req.body;
    console.log("Received order:", bodyFromClient);
    //input validation was the role of client side js why did we need to add zod?
    const { market, price, quantity, side, orderType, userId } = OrderInputSchema.parse(bodyFromClient);
    
    // 1. DATABASE TRANSACTION (The "Lock")
    const order = await prismaClient.$transaction(async (tx) => {
      
      if (side === "BUY") {
        // Lock Money
        const cost = price * quantity;
        const balance = await tx.balance.findUnique({ where: { userId } });
        if (!balance || balance.amount < cost) throw new Error("Insufficient Funds");
        
        await tx.balance.update({
          where: { userId },
          data: { amount: { decrement: cost }, locked: { increment: cost } }
        });
      } 
      
      else if (side === "SELL") {
        // Lock Stocks
        const userStock = await tx.userStock.findUnique({
          where: { userId_stockSymbol: { userId, stockSymbol: market } }
        });
        if (!userStock || userStock.quantity < quantity) throw new Error("Insufficient Stocks");
        
        await tx.userStock.update({
          where: { userId_stockSymbol: { userId, stockSymbol: market } },
          data: { quantity: { decrement: quantity }, locked: { increment: quantity } }
        });
      }

      // Create PENDING Order
      return await tx.order.create({
        data: {
          userId,
          stockSymbol: market,
          price,
          quantity,
          side,
          type: orderType, // Make sure 'type' is added to your Prisma Order model!
          status: "PENDING"
        }
      });
    });

    // 2. PUSH TO ENGINE VIA REDIS
    await redisClient.lPush("orders", JSON.stringify({
      orderId: order.id,
      userId,
      market,
      price,
      quantity,
      side,
      orderType
    }));

    res.status(200).json({ success: true, orderId: order.id, status: "PENDING" });

  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
});

export default router;
