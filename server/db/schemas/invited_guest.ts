import { pgTable, serial, integer, timestamp, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const invitedGuests = pgTable('invited_guests', {
  id: serial('id').primaryKey(),
  personId: integer('person_id').notNull(),
  invitationStamp: varchar('invitation_stamp').notNull(),
});

export const insertInvitedGuestSchema = createInsertSchema(invitedGuests, {
  id: z.number().optional(),
  personId: z.number(),
  invitationStamp: z.string(),
});

export const selectInvitedGuestSchema = createSelectSchema(invitedGuests);
