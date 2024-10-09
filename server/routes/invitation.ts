import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { invitedGuests, insertInvitedGuestSchema } from '../db/schemas/invited_guest';
import { persons, insertPersonSchema } from "../db/schemas/person";
import { eq } from "drizzle-orm";
import { events } from "../db/schemas/events";
import { z } from "zod";
import { getUser } from "../kinde";

export const invitationRoutes = new Hono()

// GET all invitations for an event
.get("/:eventId/invites", getUser, async (c) => {
  const eventId = Number(c.req.param("eventId"));
  const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);

  if (!event) return c.json({ error: 'Event not found' }, 404);

  const invitations = await db
    .select({
      attendee: invitedGuests,
      person: persons,
    })
    .from(invitedGuests)
    .innerJoin(persons, eq(invitedGuests.personId, persons.id))
    .where(eq(invitedGuests.invitationStamp, event.invitationStamp));  // Corrected this line

  return c.json({ invitations });
})

// POST a new invitation (insert person and invited guest)
.post("/:eventId/invite", getUser, zValidator("json", insertPersonSchema), async (c) => {
  const eventId = Number(c.req.param("eventId"));
  const personData = c.req.valid("json");
  
  const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
  
  if (!event) return c.json({ error: 'Event not found' }, 404);

  // Insert person (check for duplicates by email)
  const person = await db
    .insert(persons)
    .values(personData)
    .onConflictDoNothing()
    .returning()
    .then((res) => res[0]);

  if (!person) return c.json({ error: 'Person already exists or could not be created' }, 400);

  // Insert invited guest
  const invitation = {
    personId: person.id,
    invitationStamp: event.invitationStamp,
  };

  const newGuest = await db
    .insert(invitedGuests)
    .values(invitation)
    .returning()
    .then((res) => res[0]);

  return c.json({ newGuest });
})

// DELETE an invitation and the associated person
.delete("/:invitationId", getUser, async (c) => {
  const invitationId = Number(c.req.param("invitationId"));

  // Retrieve the invited guest to get the personId
  const invitedGuest = await db
    .select()
    .from(invitedGuests)
    .where(eq(invitedGuests.id, invitationId))
    .then((res) => res[0]);

  if (!invitedGuest) return c.notFound();

  // Delete the invited guest
  const deleted = await db
    .delete(invitedGuests)
    .where(eq(invitedGuests.id, invitationId))
    .returning()
    .then((res) => res[0]);

  // Also delete the associated person
  if (deleted) {
    await db.delete(persons).where(eq(persons.id, invitedGuest.personId));
  }

  return c.json({ deleted });
})

// PATCH (Edit) an invitation (update both person and invited_guest details)
.patch("/:invitationId", getUser, async (c) => {
  try {
    const invitationId = Number(c.req.param("invitationId"));
    const data = await c.req.json();
    console.log(data);

    const extendInsertInvitedGuestSchema = insertInvitedGuestSchema.extend({
      person: z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        dob: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      }).optional(),
    }).partial();

    const validData = extendInsertInvitedGuestSchema.parse(data);

    // Update the invited guest details
    const updatedGuest = await db
      .update(invitedGuests)
      .set(validData)
      .where(eq(invitedGuests.id, invitationId))
      .returning()
      .then((res) => res[0]);

    if (!updatedGuest) return c.json({ error: 'Invited guest not found' }, 404);

    // Update the person details if necessary
    if (validData.person) {
      await db
        .update(persons)
        .set(validData.person)
        .where(eq(persons.id, updatedGuest.personId));
    }

    return c.json({ updatedGuest });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation failed', details: error.errors }, 400);
    }
    console.error(error);
    return c.json({ error: 'An error occurred while updating the invited guest' }, 500);
  }
});