import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { createRouter } from "../libs/create-app";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { invitedGuests, insertInvitedGuestSchema } from '../db/schemas/invited_guest';
import { persons, insertPersonSchema } from "../db/schemas/person";
import { eq } from "drizzle-orm";
import { events } from "../db/schemas/events";
import { getUser } from "../kinde";

const invitationsRouter = createRouter();

// GET all invitations for an event
invitationsRouter.openapi(
  createRoute({
    tags: ["Invitations"],
    method: "get",
    path: "/:eventId/invites",
    middleware: getUser,
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              invitations: z.array(z.object({
                attendee: z.any(),
                person: z.any(),
              })),
            }),
          },
        },
        description: "List of invitations for the event",
      },
      [HttpStatusCodes.NOT_FOUND]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Event not found",
      },
    },
  }),
  async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);

    if (!event) return c.json({ error: 'Event not found' }, HttpStatusCodes.NOT_FOUND);

    const invitations = await db
      .select({
        attendee: invitedGuests,
        person: persons,
      })
      .from(invitedGuests)
      .innerJoin(persons, eq(invitedGuests.personId, persons.id))
      .where(eq(invitedGuests.invitationStamp, event.invitationStamp));

    return c.json({ invitations }, HttpStatusCodes.OK);
  }
);

// POST a new invitation (insert person and invited guest)
invitationsRouter.openapi(
  createRoute({
    tags: ["Invitations"],
    method: "post",
    path: "/:eventId/invite",
    middleware: getUser,
    request: {
      body: {
        content: {
          "application/json": {
            schema: insertPersonSchema,
          },
        },
      },
    },
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              newGuest: z.object({
                id: z.number(),
                personId: z.number(),
                invitationStamp: z.string(),
              }),
            }),
          },
        },
        description: "Invitation created successfully",
      },
      [HttpStatusCodes.NOT_FOUND]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Event not found",
      },
      [HttpStatusCodes.BAD_REQUEST]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Person already exists or could not be created",
      },
    },
  }),
  async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const personData = c.req.valid("json");
    
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
    
    if (!event) return c.json({ error: 'Event not found' }, HttpStatusCodes.NOT_FOUND);

    const person = await db
      .insert(persons)
      .values(personData)
      .onConflictDoNothing()
      .returning()
      .then((res) => res[0]);

    if (!person) return c.json({ error: 'Person already exists or could not be created' }, HttpStatusCodes.BAD_REQUEST);

    const invitation = {
      personId: person.id,
      invitationStamp: event.invitationStamp,
    };

    const newGuest = await db
      .insert(invitedGuests)
      .values(invitation)
      .returning()
      .then((res) => res[0]);

    return c.json({ newGuest }, HttpStatusCodes.OK);
  }
);

// DELETE an invitation and the associated person
invitationsRouter.openapi(
  createRoute({
    tags: ["Invitations"],
    method: "delete",
    path: "/:invitationId",
    middleware: getUser,
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              deleted: z.any(),
            }),
          },
        },
        description: "Invitation deleted successfully",
      },
      [HttpStatusCodes.NOT_FOUND]: {
        description: "Invitation not found",
      },
    },
  }),
  async (c) => {
    const invitationId = Number(c.req.param("invitationId"));

    const invitedGuest = await db
      .select()
      .from(invitedGuests)
      .where(eq(invitedGuests.id, invitationId))
      .then((res) => res[0]);

    if (!invitedGuest) return c.notFound();

    const deleted = await db
      .delete(invitedGuests)
      .where(eq(invitedGuests.id, invitationId))
      .returning()
      .then((res) => res[0]);

    if (deleted) {
      await db.delete(persons).where(eq(persons.id, invitedGuest.personId));
    }

    return c.json({ deleted }, HttpStatusCodes.OK);
  }
);

// PATCH (Edit) an invitation (update both person and invited_guest details)
invitationsRouter.openapi(
  createRoute({
    tags: ["Invitations"],
    method: "patch",
    path: "/:invitationId",
    request: {
      body: {
        content: {
          "application/json": {
            schema: insertInvitedGuestSchema.extend({
              person: z.object({
                firstName: z.string().optional(),
                lastName: z.string().optional(),
                dob: z.string().optional(),
                email: z.string().optional(),
                phone: z.string().optional(),
              }).optional(),
            }).partial(),
          },
        },
      },
    },
    middleware: getUser,
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              updatedGuest: z.any(),
            }),
          },
        },
        description: "Invitation updated successfully",
      },
      [HttpStatusCodes.NOT_FOUND]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Invited guest not found",
      },
      [HttpStatusCodes.BAD_REQUEST]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
              details: z.array(z.any()),
            }),
          },
        },
        description: "Validation failed",
      },
      [HttpStatusCodes.INTERNAL_SERVER_ERROR]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "An error occurred while updating the invited guest",
      },
    },
  }),
  async (c) => {
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

      const updatedGuest = await db
        .update(invitedGuests)
        .set(validData)
        .where(eq(invitedGuests.id, invitationId))
        .returning()
        .then((res) => res[0]);

      if (!updatedGuest) return c.json({ error: 'Invited guest not found' }, HttpStatusCodes.NOT_FOUND);

      if (validData.person) {
        await db
          .update(persons)
          .set(validData.person)
          .where(eq(persons.id, updatedGuest.personId));
      }

      return c.json({ updatedGuest }, HttpStatusCodes.OK);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: error.errors }, HttpStatusCodes.BAD_REQUEST);
      }
      console.error(error);
      return c.json({ error: 'An error occurred while updating the invited guest' }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
);

export default invitationsRouter;