import { pgTable, serial, integer, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';
import { sponsors } from './sponsor';
import { events } from './events';

export const eventSponsors = pgTable('event_sponsors', {
  id: serial('id').primaryKey(),
  sponsorId: integer('sponsor_id').notNull().references(() => sponsors.id),
  eventId: integer('event_id').notNull().references(() => events.id),
  sponsorshipAgreement: text('sponsorship_agreement').notNull(),
});

export const insertEventSponsorSchema = createInsertSchema(eventSponsors, {
  id: z.string().optional(),
  sponsorId: z.number(),
  eventId: z.number(),
  sponsorshipAgreement: z.string(),
});

export const selectEventSponsorSchema = createSelectSchema(eventSponsors);
