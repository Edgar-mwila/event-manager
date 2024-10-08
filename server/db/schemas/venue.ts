import { pgTable, serial, varchar, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const venues = pgTable('venues', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  capacity: integer('capacity').notNull(),
  province: varchar('province', { length: 50 }).notNull(),
  town: varchar('town', { length: 50 }).notNull(),
  address: varchar('address', { length: 255 }).notNull(),
});

// Insert schema for validation
export const insertVenueSchema = createInsertSchema(venues, {
  id: z.number().optional(),
  capacity: z.number().min(1),
});

// Select schema for validation
export const selectVenueSchema = createSelectSchema(venues);
