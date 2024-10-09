import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { attendees, insertAttendeeSchema } from "../db/schemas/attendee";
import { persons, insertPersonSchema } from "../db/schemas/person";
import { eq } from "drizzle-orm";
import { events } from '../db/schemas/events';
import { z } from "zod";
import { getUser } from "../kinde";

export const ticketRoutes = new Hono()

  // Get all tickets for event (joined with persons)
  .get("/:eventId/tickets", getUser,  async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
    
    if (!event) return c.json({ error: "Event not found" }, 404);

    const tickets = await db
      .select({
        attendee: attendees,
        person: persons,
      })
      .from(attendees)
      .innerJoin(persons, eq(attendees.personId, persons.id))
      .where(eq(attendees.ticketStamp, event.ticketStamp));

    return c.json({ tickets });
  })

  // Buy ticket (with person and attendee logic)
  .post("/:eventId/ticket", zValidator("json", insertPersonSchema), async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);

    if (!event) return c.json({ error: "Event not found" }, 404);

    const personData = c.req.valid("json");

    // Check for person duplication via email
    const person = await db.insert(persons)
      .values(personData)
      .onConflictDoNothing()
      .returning()
      .then((res) => res[0]);

    if (!person) return c.json({ error: "Person already exists or failed to create" }, 400);

    // Insert attendee with event and person IDs
    const attendee = {
      personId: person.id,
      ticketStamp: event.ticketStamp,
    };
    const newAttendee = await db.insert(attendees).values(attendee).returning().then((res) => res[0]);

    return c.json({ newAttendee });
  })

  // Return ticket (delete from attendees and associated person if no other reference)
  .delete("/:ticketId", async (c) => {
    const ticketId = Number(c.req.param("ticketId"));

    const attendee = await db.delete(attendees)
      .where(eq(attendees.id, ticketId))
      .returning()
      .then((res) => res[0]);

    if (!attendee) return c.notFound();

    // Optionally delete the person if they are no longer referenced by any other table
    const remainingAttendees = await db.select().from(attendees).where(eq(attendees.personId, attendee.personId));
    if (remainingAttendees.length === 0) {
      await db.delete(persons).where(eq(persons.id, attendee.personId));
    }

    return c.json({ attendee });
  })

  // Edit ticket (update person and attendee details)
  .patch("/:ticketId", async (c) => {
    try {
      const ticketId = Number(c.req.param("ticketId"));
      const data = await c.req.json();
      console.log(data);
  
      const extendInsertAttendeeSchema = insertAttendeeSchema.extend({
        person: z.object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
          dob: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
        }).optional(),
      }).partial();
  
      const validData = extendInsertAttendeeSchema.parse(data);
  
      // Update the attendee details
      const updatedAttendee = await db
        .update(attendees)
        .set(validData)
        .where(eq(attendees.id, ticketId))
        .returning()
        .then((res) => res[0]);
  
      if (!updatedAttendee) return c.json({ error: 'Attendee not found' }, 404);
  
      // Update the person details if necessary
      if (validData.person) {
        await db
          .update(persons)
          .set(validData.person)
          .where(eq(persons.id, updatedAttendee.personId));
      }
  
      return c.json({ updatedAttendee });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: error.errors }, 400);
      }
      console.error(error);
      return c.json({ error: 'An error occurred while updating the ticket' }, 500);
    }
  });
