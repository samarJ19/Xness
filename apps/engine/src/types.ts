export interface Order {
    price: number;
    qty: number;
    orderId: string; // Unique ID for every order
    userId: string;  // Needed to identify who gets the money
    type: "buy" | "sell";
}
