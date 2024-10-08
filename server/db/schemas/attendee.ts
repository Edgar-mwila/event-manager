import { pgTable, serial, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const attendees = pgTable('attendees', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull(),
  ticketStamp: varchar('ticket_stamp').notNull(),
});

export const insertAttendeeSchema = createInsertSchema(attendees, {
  id: z.number().optional(),
  personId: z.number(),
  ticketStamp: z.string(),
});

export const selectAttendeeSchema = createSelectSchema(attendees);
