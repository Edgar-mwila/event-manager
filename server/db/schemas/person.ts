import { pgTable, serial, varchar, date, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  dob: date('dob').notNull(),
  email: varchar("email", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 13 }).notNull(),
});

export const insertPersonSchema = createInsertSchema(persons, {
  id: z.string().optional(),
  firstName: z.string().max(50),
  lastName: z.string().max(50),
  dob: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
});

export const selectPersonSchema = createSelectSchema(persons);
