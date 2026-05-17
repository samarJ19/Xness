import express from "express";
import orderRouter from "./routes/order.routes";
const app = express();

//make middleware for the routes
//auth
//orders
//body parser
app.use(express.json());
app.use('/api/order',orderRouter)

app.listen(process.env.PORT, () => {
  console.log(`Server live on ${process.env.PORT}`);
});
