import { z } from "zod";

export const OrderInputSchema = z.object({
  market: z.string(),
  price: z.number().int().positive(), // Reference price for Market, Exact for Limit
  quantity: z.number().int().positive(),
  side: z.enum(["BUY", "SELL"]),
  orderType: z.enum(["LIMIT", "MARKET"]),
  userId: z.string()
});