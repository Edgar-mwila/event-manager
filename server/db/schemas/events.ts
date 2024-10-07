import { pgTable, serial, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  venueId: integer('venue_id').notNull(),
  ticketStamp: varchar('ticket_stamp', { length: 50 }).notNull(),
  invitationStamp: varchar('invitation_stamp', {length: 50}).notNull(),
});

export const insertEventSchema = createInsertSchema(events, {
  id: z.string().optional(),
  name: z.string().max(100),
  type: z.string().max(50),
  venueId: z.number(),
});

export const selectEventSchema = createSelectSchema(events);
