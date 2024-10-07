import { type Config } from 'drizzle-kit';

export default {
    schema: './server/db/schemas/*',
    out: './drizzle',
    dialect: 'postgresql',
    dbCredentials: {
    url: process.env.DATABASE_URL!,
    },
} satisfies Config;
