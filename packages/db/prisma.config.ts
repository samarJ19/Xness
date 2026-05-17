import dotenv from "dotenv";
import path from "node:path";
dotenv.config({ path: path.join(__dirname,'.env')});

import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})