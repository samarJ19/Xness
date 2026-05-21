import { Order } from "./types";

// Define the structure of our book collection
interface OrderBook {
    bids: Order[];
    asks: Order[];
}

// orderbook.ts
// A Map where key is stock name (e.g., "AAPL") and value is its specific book
export const orderbooks: Record<string, OrderBook> = {};

export interface TradeExecution {
    buyerOrderId: string;
    sellerOrderId: string;
    buyerUserId: string;
    sellerUserId: string;
    stockSymbol: string;
    executionPrice: number;
    executionQty: number;
}

function logTrade(maker: Order, takerQty: number, takerPrice: number, stock: string) {
    console.log(`TRADE EXECUTED [${stock}]: 
    Maker (User ${maker.userId}): Sold ${takerQty} @ ${maker.price}
    matched with 
    Taker: Bought ${takerQty} @ ${takerPrice}`);
}

export function placeOrder(
    stock: string,       // New: Identifies which stock we are trading
    orderId: string, 
    userId: string, 
    side: "buy" | "sell", 
    price: number, 
    quantity: number
): TradeExecution[] {
    // 1. Ensure the orderbook for this specific stock exists
    if (!orderbooks[stock]) {
        orderbooks[stock] = { bids: [], asks: [] };
    }

    const book = orderbooks[stock];
    let remainingQty = quantity;
    const executions: TradeExecution[] = [];

    if (side === "buy") {
        for (let i = 0; i < book.asks.length; i++) {
            const maker = book.asks[i];
            if (!maker) {
                continue;
            }

            if (maker.price <= price) {
                if (maker.qty > remainingQty) {
                    maker.qty -= remainingQty;
                    logTrade(maker, remainingQty, maker.price, stock);
                    executions.push({
                        buyerOrderId: orderId,
                        sellerOrderId: maker.orderId,
                        buyerUserId: userId,
                        sellerUserId: maker.userId,
                        stockSymbol: stock,
                        executionPrice: maker.price,
                        executionQty: remainingQty,
                    });
                    return executions;
                }

                const matchedQty = maker.qty;
                remainingQty -= matchedQty;
                logTrade(maker, matchedQty, maker.price, stock);
                executions.push({
                    buyerOrderId: orderId,
                    sellerOrderId: maker.orderId,
                    buyerUserId: userId,
                    sellerUserId: maker.userId,
                    stockSymbol: stock,
                    executionPrice: maker.price,
                    executionQty: matchedQty,
                });
                book.asks.splice(i, 1);
                i--;
                if (remainingQty === 0) return executions;
            }
        }
        book.bids.push({ orderId, userId, price, qty: remainingQty, type: "buy" });
        book.bids.sort((a, b) => b.price - a.price);
    } else {
        // side === "sell"
        for (let i = 0; i < book.bids.length; i++) {
            const maker = book.bids[i];
            if (!maker) {
                continue;
            }

            if (maker.price >= price) {
                if (maker.qty > remainingQty) {
                    maker.qty -= remainingQty;
                    logTrade(maker, remainingQty, maker.price, stock);
                    executions.push({
                        buyerOrderId: maker.orderId,
                        sellerOrderId: orderId,
                        buyerUserId: maker.userId,
                        sellerUserId: userId,
                        stockSymbol: stock,
                        executionPrice: maker.price,
                        executionQty: remainingQty,
                    });
                    return executions;
                }

                const matchedQty = maker.qty;
                remainingQty -= matchedQty;
                logTrade(maker, matchedQty, maker.price, stock);
                executions.push({
                    buyerOrderId: maker.orderId,
                    sellerOrderId: orderId,
                    buyerUserId: maker.userId,
                    sellerUserId: userId,
                    stockSymbol: stock,
                    executionPrice: maker.price,
                    executionQty: matchedQty,
                });
                book.bids.splice(i, 1);
                i--;
                if (remainingQty === 0) return executions;
            }
        }
        book.asks.push({ orderId, userId, price, qty: remainingQty, type: "sell" });
        book.asks.sort((a, b) => a.price - b.price);
    }

    return executions;
}

