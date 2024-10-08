import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { attendees, insertAttendeeSchema } from "../db/schemas/attendee";
import { persons, insertPersonSchema } from "../db/schemas/person";
import { eq } from "drizzle-orm";
import { events } from '../db/schemas/events';

export const ticketRoutes = new Hono()
  // See all tickets for event (joined with persons)
  .get("/:eventId/tickets", async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
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
    const personData = c.req.valid("json");
    const validPerson = insertPersonSchema.parse(personData)
    // Insert person (or check for duplicate via email)
    const person = await db.insert(persons).values(validPerson).onConflictDoNothing().returning().then((res) => res[0]);

    // Insert attendee with event ID and person ID
    const attendee = {
      personId: person.id as number,
      ticketStamp: event.ticketStamp,
    };
    const newAttendee = await db.insert(attendees).values(attendee).returning().then((res) => res[0]);

    return c.json({ newAttendee });
  })

  // Return ticket (delete from attendees)
  .delete("/:ticketId", async (c) => {
    const ticketId = Number(c.req.param("ticketId"));
    const deleted = await db.delete(attendees).where(eq(attendees.id, ticketId)).returning().then((res) => res[0]);
    if (!deleted) return c.notFound();
    return c.json({ deleted });
  })

  // Edit ticket (update person and attendee details)
  .patch("/:ticketId", zValidator("json", insertAttendeeSchema), async (c) => {
    const ticketId = Number(c.req.param("ticketId"));
    const data = c.req.valid("json");

    const updated = await db.update(attendees).set(data).where(eq(attendees.id, ticketId)).returning().then((res) => res[0]);
    if (!updated) return c.notFound();
    return c.json({ updated });
  });
