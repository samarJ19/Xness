import { createClient } from "redis";
import { prismaClient } from "@repo/db";

async function startSettlementWorker() {
  const subscriber = createClient();
  await subscriber.connect();
  console.log("Settlement Worker connected to Redis Pub/Sub.");

  // Subscribe to the "trades" channel
  await subscriber.subscribe("trades", async (message) => {
    const tradeData = JSON.parse(message);
    console.log(`Settling trade for ${tradeData.executionQty} ${tradeData.stockSymbol}`);

    try {
      // Execute Settlement in a single ACID Transaction
      await prismaClient.$transaction(async (tx) => {
        
        // 1. CREATE TRADE RECORD
        await tx.trade.create({
          data: {
            price: tradeData.executionPrice,
            qty: tradeData.executionQty,
            bidOrderId: tradeData.buyerOrderId,
            askOrderId: tradeData.sellerOrderId,
          }
        });

        // 2. SETTLE BUYER (Deduct locked money, give stocks)
        const totalCost = tradeData.executionPrice * tradeData.executionQty;
        await tx.balance.update({
          where: { userId: tradeData.buyerUserId },
          data: { locked: { decrement: totalCost } }
          // Note: If this was a Market order and locked price was higher than execution price,
          // you would also refund the difference to 'amount' here.
        });

        // Give Buyer the stock (Upsert: create if they don't own it yet, otherwise update)
        await tx.userStock.upsert({
          where: { userId_stockSymbol: { userId: tradeData.buyerUserId, stockSymbol: tradeData.stockSymbol } },
          update: { quantity: { increment: tradeData.executionQty } },
          create: { userId: tradeData.buyerUserId, stockSymbol: tradeData.stockSymbol, quantity: tradeData.executionQty }
        });

        // 3. SETTLE SELLER (Deduct locked stocks, give money)
        await tx.userStock.update({
          where: { userId_stockSymbol: { userId: tradeData.sellerUserId, stockSymbol: tradeData.stockSymbol } },
          data: { locked: { decrement: tradeData.executionQty } }
        });

        await tx.balance.update({
          where: { userId: tradeData.sellerUserId },
          data: { amount: { increment: totalCost } } // Seller gets paid
        });

        // 4. UPDATE ORDER STATUSES
        // In reality, you'd check if remaining qty is 0 to set "FILLED" vs "PARTIALLY_FILLED"
        await tx.order.updateMany({
          where: { id: { in: [tradeData.buyerOrderId, tradeData.sellerOrderId] } },
          data: { status: "FILLED" } 
        });

      });
      
      console.log("Trade Settled Successfully in DB.");

    } catch (error) {
      console.error("CRITICAL ERROR: Failed to settle trade in DB", error);
      // In production, you'd push this to a Dead Letter Queue (DLQ) for manual review
    }
  });
}

startSettlementWorker();