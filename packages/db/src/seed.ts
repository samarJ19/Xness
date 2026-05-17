import 'dotenv/config'; // Explicitly loads the .env file from your db directory
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// 1. Initialize the adapter with your connection string
const adapter = new PrismaPg({ 
  connectionString: process.env.DATABASE_URL! 
});

// 2. Pass the adapter into the Prisma client
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Cleaning up old data...");
  // Delete in reverse order of relations to avoid foreign key constraints
  await prisma.trade.deleteMany();
  await prisma.order.deleteMany();
  await prisma.userStock.deleteMany();
  await prisma.balance.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding Database...");

  // 1. Create Alice (The Buyer)
  const alice = await prisma.user.create({
    data: {
      email: 'alice@example.com',
      password: 'password123', // In a real app, use bcrypt!
      balances: {
        create: [
          // Alice has ₹100,000.00 (Stored as 10,000,000 cents/paise)
          { amount: 10000000, locked: 0 } 
        ]
      }
    }
  });

  // 2. Create Bob (The Seller)
  const bob = await prisma.user.create({
    data: {
      email: 'bob@example.com',
      password: 'password123',
      balances: {
        create: [
          // Bob has ₹5,000.00 (500,000 cents/paise)
          { amount: 500000, locked: 0 }
        ]
      },
      userStocks: {
        create: [
          // Bob owns 100 shares of TATA, ready to sell
          { stockSymbol: 'TATA', quantity: 100, locked: 0 }
        ]
      }
    }
  });

  console.log("✅ Seed Successful!");
  console.log("--------------------------------------------------");
  console.log(`Alice (Buyer) ID : ${alice.id}`);
  console.log(`Bob (Seller) ID  : ${bob.id}`);
  console.log("--------------------------------------------------");
  console.log("Save these IDs to use in your Postman requests!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });