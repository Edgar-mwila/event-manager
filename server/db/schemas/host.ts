import { pgTable, serial, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const hosts = pgTable('hosts', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull(),
  eventId: integer('event_id').notNull(),
});

export const insertHostSchema = createInsertSchema(hosts, {
  id: z.string().optional(),
  personId: z.number(),
  eventId: z.number(),
});

export const selectHostSchema = createSelectSchema(hosts);
