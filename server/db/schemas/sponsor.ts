import { pgTable, serial, varchar, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const sponsors = pgTable('sponsors', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 13 }).notNull(),
});

export const insertSponsorSchema = createInsertSchema(sponsors, {
  id: z.string().optional(),
  name: z.string().max(100),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const selectSponsorSchema = createSelectSchema(sponsors);
