import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createRouter } from "../libs/create-app";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import { attendees, insertAttendeeSchema } from "../db/schemas/attendee";
import { persons, insertPersonSchema } from "../db/schemas/person";
import { eq } from "drizzle-orm";
import { events } from '../db/schemas/events';
import { getUser } from "../kinde";
import { z } from "@hono/zod-openapi";
const ticketsRouter = createRouter();

// Get all tickets for event (joined with persons)
ticketsRouter.openapi(
  createRoute({
    tags: ["Tickets"],
    method: "get",
    path: "/:eventId/tickets",
    middleware: getUser,
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              tickets: z.array(z.object({
                attendee: z.any(),
                person: z.any(),
              })),
            }),
          },
        },
        description: "List of tickets for the event",
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
    
    if (!event) return c.json({ error: "Event not found" }, HttpStatusCodes.NOT_FOUND);

    const tickets = await db
      .select({
        attendee: attendees,
        person: persons,
      })
      .from(attendees)
      .innerJoin(persons, eq(attendees.personId, persons.id))
      .where(eq(attendees.ticketStamp, event.ticketStamp));

    return c.json({ tickets }, HttpStatusCodes.OK);
  }
);

// Buy ticket (with person and attendee logic)
ticketsRouter.openapi(
  createRoute({
    tags: ["Tickets"],
    method: "post",
    path: "/:eventId/ticket",
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
              newAttendee: z.object({
                id: z.number(),
                personId: z.number(),
                ticketStamp: z.string(),
              }),
            }),
          },
        },
        description: "Ticket purchased successfully",
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
        description: "Person already exists or failed to create",
      },
    },
  }),
  async (c) => {
    const eventId = Number(c.req.param("eventId"));
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);

    if (!event) return c.json({ error: "Event not found" }, HttpStatusCodes.NOT_FOUND);

    const personData = c.req.valid("json");

    const person = await db.insert(persons)
      .values(personData)
      .onConflictDoNothing()
      .returning()
      .then((res) => res[0]);

    if (!person) return c.json({ error: "Person already exists or failed to create" }, HttpStatusCodes.BAD_REQUEST);

    const attendee = {
      personId: person.id,
      ticketStamp: event.ticketStamp,
    };
    const newAttendee = await db.insert(attendees).values(attendee).returning().then((res) => res[0]);

    return c.json({ newAttendee }, HttpStatusCodes.OK);
  }
);

// Return ticket (delete from attendees and associated person if no other reference)
ticketsRouter.openapi(
  createRoute({
    tags: ["Tickets"],
    method: "delete",
    path: "/:ticketId",
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              attendee: z.any(),
            }),
          },
        },
        description: "Ticket returned successfully",
      },
      [HttpStatusCodes.NOT_FOUND]: {
        description: "Ticket not found",
      },
    },
  }),
  async (c) => {
    const ticketId = Number(c.req.param("ticketId"));

    const attendee = await db.delete(attendees)
      .where(eq(attendees.id, ticketId))
      .returning()
      .then((res) => res[0]);

    if (!attendee) return c.notFound();

    const remainingAttendees = await db.select().from(attendees).where(eq(attendees.personId, attendee.personId));
    if (remainingAttendees.length === 0) {
      await db.delete(persons).where(eq(persons.id, attendee.personId));
    }

    return c.json({ attendee }, HttpStatusCodes.OK);
  }
);

// Edit ticket (update person and attendee details)
ticketsRouter.openapi(
  createRoute({
    tags: ["Tickets"],
    method: "patch",
    path: "/:ticketId",
    request: {
      body: {
        content: {
          "application/json": {
            schema: insertAttendeeSchema.extend({
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
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: z.object({
              updatedAttendee: z.any(),
            }),
          },
        },
        description: "Ticket updated successfully",
      },
      [HttpStatusCodes.NOT_FOUND]: {
        content: {
          "application/json": {
            schema: z.object({
              error: z.string(),
            }),
          },
        },
        description: "Attendee not found",
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
        description: "An error occurred while updating the ticket",
      },
    },
  }),
  async (c) => {
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
  
      const updatedAttendee = await db
        .update(attendees)
        .set(validData)
        .where(eq(attendees.id, ticketId))
        .returning()
        .then((res) => res[0]);
  
      if (!updatedAttendee) return c.json({ error: 'Attendee not found' }, HttpStatusCodes.NOT_FOUND);
  
      if (validData.person) {
        await db
          .update(persons)
          .set(validData.person)
          .where(eq(persons.id, updatedAttendee.personId));
      }
  
      return c.json({ updatedAttendee }, HttpStatusCodes.OK);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({ error: 'Validation failed', details: error.errors }, HttpStatusCodes.BAD_REQUEST);
      }
      console.error(error);
      return c.json({ error: 'An error occurred while updating the ticket' }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
    }
  }
);

export default ticketsRouter;