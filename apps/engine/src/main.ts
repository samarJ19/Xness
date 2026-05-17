import { createClient } from "redis";
import { placeOrder } from "./orderbook"; // Import your logic from previous step

async function startWorker() {
  const client = createClient();
  await client.connect();
  console.log("Worker connected to Redis.");

  // Infinite loop to process orders
  while (true) {
    try {
      // "brpop" = Blocking Right Pop
      // It waits forever until 'orders' queue has data
      const response = await client.brPop("orders", 0);

      if (!response) {
        console.log("No response from Redis");
        return;
      }

      // response returns keys/values. We need the element.
      // response structure: { key: 'orders', element: '{"type":"buy",...}' }

      const orderData = JSON.parse(response.element);
      const side = String(orderData.side).toLowerCase();

      console.log(`Processing Order: ${orderData.orderId}`);

      if (side !== "buy" && side !== "sell") {
        throw new Error(`Invalid side received from queue: ${orderData.side}`);
      }

      // Call your matching logic
      const executions = placeOrder(
        orderData.market,
        orderData.orderId,
        orderData.userId,
        side,
        orderData.price,
        orderData.quantity
      );

      for (const execution of executions) {
        await client.publish("trades", JSON.stringify(execution));
      }
    } catch (error) {
      console.error("Error processing order:", error);
    }
  }
}

startWorker();
