const { createClient } = require('redis');

async function sendOrder() {
    const client = createClient();
    await client.connect();

    // Mimic a user clicking "Buy"
    const order = {
        stock:"TESL",
        id: "2",
        userId:"user2",
        side: "sell",
        price: 90,
        quantity: 10
    };

    // Push to the "orders" queue
    await client.lPush('orders', JSON.stringify(order));
    console.log("Order sent to queue!");
    process.exit(0);
}

sendOrder();