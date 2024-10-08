import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { invitedGuests, insertInvitedGuestSchema } from "../db/schemas/invited_guest";
import { persons, insertPersonSchema } from "../db/schemas/person";
import { eq } from "drizzle-orm";
import { events } from "../db/schemas/events";

export const invitationRoutes = new Hono()

.get("/:eventId/invites", async (c) => {
  const eventId = Number(c.req.param("eventId"));
  const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
  const invitations = await db
    .select({
      attendee: invitedGuests,
      person: persons,
    })
    .from(invitedGuests)
    .innerJoin(persons, eq(invitedGuests.personId, persons.id))
    .where(eq(invitedGuests.invitationStamp, event.ticketStamp));

  return c.json({ invitations });
})
  // Send invitation (insert into invited_guests and person)
  .post("/:eventId/invite", zValidator("json", insertPersonSchema), async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const personData = c.req.valid("json");
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
    // Insert person (check for duplicates by email)
    const person = await db.insert(persons).values(personData).onConflictDoNothing().returning().then((res) => res[0]);

    // Insert invited guest
    const invitation = {
      personId: person.id,
      invitationStamp: event.invitationStamp,
    };
    const newGuest = await db.insert(invitedGuests).values(invitation).returning().then((res) => res[0]);

    return c.json({ newGuest });
  })

  // Cancel invitation (delete from invited_guests)
  .delete("/:invitationId", async (c) => {
    const invitationId = Number(c.req.param("invitationId"));
    const deleted = await db.delete(invitedGuests).where(eq(invitedGuests.id, invitationId)).returning().then((res) => res[0]);
    if (!deleted) return c.notFound();
    return c.json({ deleted });
  })

  // Edit invitation (update person and invited_guest details)
  .patch("/:invitationId", zValidator("json", insertInvitedGuestSchema), async (c) => {
    const invitationId = Number(c.req.param("invitationId"));
    const data = c.req.valid("json");

    const updated = await db.update(invitedGuests).set(data).where(eq(invitedGuests.id, invitationId)).returning().then((res) => res[0]);
    if (!updated) return c.notFound();
    return c.json({ updated });
  });
