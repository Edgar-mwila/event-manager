import { Hono } from 'hono';
import { db } from '../db';
import { events, insertEventSchema } from '../db/schemas/events';
import { attendees } from '../db/schemas/attendee';
import { hosts } from '../db/schemas/host';
import { persons } from '../db/schemas/person';
import { sponsors } from '../db/schemas/sponsor';
import { venues } from '../db/schemas/venue';
import { eventSponsors } from '../db/schemas/event_sponsor';
import { and, eq } from "drizzle-orm";
import { invitedGuests } from '../db/schemas/invited_guest';
import { getUser } from '../kinde';
import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema, createErrorSchema } from "stoker/openapi/schemas";
import { createRouter } from "../libs/create-app";

const eventsRouter = createRouter();

// List all events
eventsRouter.openapi(
  createRoute({
    tags: ["Events"],
    method: "get",
    path: "/",
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        z.array(z.object({
          id: z.number(),
          name: z.string(),
          type: z.string(),
          venueId: z.number(),
          ticketStamp: z.string(),
          invitationStamp: z.string(),
        })),
        "List of all events",
      ),
    },
  }),
  async (c) => {
    const allEvents = await db.select().from(events);
    return c.json(allEvents, HttpStatusCodes.OK);
  },
);

// Get event details
eventsRouter.openapi(
  createRoute({
    tags: ["Events"],
    method: "get",
    path: "/:eventId",
    request: {
      params: z.object({
        eventId: z.string(),
      }),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        z.object({
          event: z.object({
            id: z.number(),
            name: z.string(),
            type: z.string(),
            venueId: z.number(),
            ticketStamp: z.string(),
            invitationStamp: z.string(),
          }),
          venue: z.object({
            id: z.number(),
            name: z.string(),
            province: z.string(),
            town: z.string(),
            address: z.string(),
            capacity: z.number(),
          }).nullable(),  // Venue can be null
        
          sponsors: z.array(
            z.object({
              id: z.number(),
              name: z.string(),
              email: z.string(),
              phone: z.string(),
            }).nullable() // Individual sponsor objects can be null
          ), 
        
          host: z.object({
            id: z.number(),
            firstName: z.string(),
            lastName: z.string(),
            dob: z.string(),
            email: z.string(),
            phone: z.string(),
          }).nullable(), // Host can be null
        }),
        "Event details",
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        createMessageObjectSchema("Invalid event ID"),
        "Invalid event ID",
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        createMessageObjectSchema("Event not found"),
        "Event not found",
      ),
    },
  }), async (c) => {
  const eventId = parseInt(c.req.param('eventId'));
  if (isNaN(eventId)) {
    return c.json({ message: "eventId is not valid" }, 404);
  }

  const eventDetails = await db
    .select({
      event: events,
      venue: venues,
      sponsors: sponsors,
      host: persons
    })
    .from(events)
    .where(eq(events.id, eventId))
    .leftJoin(venues, eq(venues.id, events.venueId))
    .leftJoin(eventSponsors, eq(eventSponsors.eventId, events.id))
    .leftJoin(sponsors, eq(sponsors.id, eventSponsors.sponsorId))
    .leftJoin(hosts, eq(hosts.eventId, events.id))
    .leftJoin(persons, eq(persons.id, hosts.personId));

  if (!eventDetails || eventDetails.length === 0) {
    return c.json({ message: "Event not found" }, 404);
  }

  return c.json({
    success: true,
    event: eventDetails[0].event,
    venue: eventDetails[0].venue,
    sponsors: eventDetails.filter(row => row.sponsors).map(row => row.sponsors),
    host: eventDetails[0].host
  }, 200);
});

// Create new event
eventsRouter.openapi(
  createRoute({
    tags: ["Events"],
    method: "post",
    path: "/",
    middleware: getUser,
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.object({
              name: z.string(),
              type: z.string(),
              ticketStamp: z.string(),
              invitationStamp: z.string(),
              venue: z.object({
                name: z.string(),
                province: z.string(),
                town: z.string(),
                address: z.string(),
                capacity: z.number(),
              }),
              sponsors: z.array(z.object({
                name: z.string(),
                email: z.string(),
                phone: z.string(),
                sponsorshipAgreement: z.string(),
              })),
              host: z.object({
                firstName: z.string(),
                lastName: z.string(),
                dob: z.string(),
                email: z.string(),
                phone: z.string(),
              }),
            }),
          },
        },
      },
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        z.object({
          message: z.string(),
          eventId: z.number(),
        }),
        "Event created successfully",
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        createMessageObjectSchema("An error occurred while creating the event"),
        "Error creating event",
      ),
    },
  }), async (c) => {
  try {
    const extendedInsertEventSchema = insertEventSchema.extend({
      venue: z.object({
        name: z.string(),
        province: z.string(),
        town: z.string(),
        address: z.string(),
        capacity: z.number(),
      }),
      sponsors: z.array(z.object({
        name: z.string(),
        email: z.string(),
        phone: z.string(),
        sponsorshipAgreement: z.string(),
      })),
      host: z.object({
        firstName: z.string(),
        lastName: z.string(),
        dob: z.string(),
        email: z.string(),
        phone: z.string(),
      }),
    });

    const eventData = extendedInsertEventSchema.parse(await c.req.json());

    // Insert or find venue
    const [venue] = await db
      .insert(venues)
      .values(eventData.venue)
      .returning();

    if (!venue) {
      return c.json({ message: "Could not find or create venue." }, 400);
    }

    // Insert or find sponsors
    const sponsorPromises = eventData.sponsors.map(sponsor =>
      db.insert(sponsors)
        .values({
          name: sponsor.name,
          email: sponsor.email,
          phone: sponsor.phone,
        })
        .returning()
    );

    const insertedSponsors = await Promise.all(sponsorPromises);

    // Insert or find the person (host)
    const [host] = await db
      .insert(persons)
      .values(eventData.host)
      .returning();

    if (!host) {
      return c.json({ message: "Could not find or create host." }, 400);
    }

    // Insert event
    const [event] = await db
      .insert(events)
      .values({
        name: eventData.name,
        type: eventData.type,
        venueId: venue.id,
        ticketStamp: eventData.ticketStamp,
        invitationStamp: eventData.invitationStamp,
      })
      .returning();

    // Insert host relationship
    await db.insert(hosts).values({
      eventId: event.id,
      personId: host.id,
    });

    // Insert event-sponsor relationships
    await Promise.all(
      insertedSponsors.map(([sponsor], index) =>
        db.insert(eventSponsors).values({
          sponsorId: sponsor.id,
          eventId: event.id,
          sponsorshipAgreement: eventData.sponsors[index].sponsorshipAgreement,
        })
      )
    );

    return c.json({ message: "Event created successfully!", eventId: event.id }, 200);
  } catch (err) {
    console.error(err);
    return c.json({ message: "An error occurred while creating the event." }, 400);
  }
});

// Edit event
eventsRouter.openapi(
  createRoute({
    tags: ["Events"],
    method: "put",
    path: "/:eventId",
    middleware: getUser,
    request: {
      params: z.object({
        eventId: z.string(),
      }),
      body: {
        content: {
          "application/json": {
            schema: insertEventSchema
          },
        },
      },
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        createMessageObjectSchema("Event updated successfully"),
        "Event updated",
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        createMessageObjectSchema("An error occurred while updating the event"),
        "Error updating event",
      ),
    },
  }), async (c) => {
    const eventId = parseInt(c.req.param('eventId'));
    if (isNaN(eventId)) {
      return c.json({ message: "eventId is not valid" }, 400);
    }

    const eventData = insertEventSchema.parse(await c.req.json());

    await db.update(events).set(eventData).where(eq(events.id, eventId));
    return c.json({ message: 'Event updated successfully!' }, 200);
});

// Delete event
eventsRouter.openapi(
  createRoute({
    tags: ["Events"],
    method: "delete",
    path: "/:eventId",
    middleware: getUser,
    request: {
      params: z.object({
        eventId: z.string(),
      }),
    },
    responses: {
      [HttpStatusCodes.OK]: jsonContent(
        createMessageObjectSchema("Event and all related records deleted successfully"),
        "Event deleted",
      ),
      [HttpStatusCodes.BAD_REQUEST]: jsonContent(
        createMessageObjectSchema("An error occurred while deleting the event and related records"),
        "Error deleting event",
      ),
      [HttpStatusCodes.NOT_FOUND]: jsonContent(
        createMessageObjectSchema("Event not found"),
        "Event not found",
      ),
    },
  }), async (c) => {
  try {
    const eventId = parseInt(c.req.param('eventId'));
    if (isNaN(eventId)) {
      return c.json({ message: "Event not found" }, 404);
    }

    // Fetch the event
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
    if (!event) {
      return c.json({ message: "Event not found" }, 404);
    }

    // Start a transaction
    await db.transaction(async (tx) => {
      // Delete event sponsors and referenced sponsors
      const eventSponsorsToDelete = await tx.select({ sponsorId: eventSponsors.sponsorId })
        .from(eventSponsors)
        .where(eq(eventSponsors.eventId, eventId));
      await tx.delete(eventSponsors).where(eq(eventSponsors.eventId, eventId));
      for (const { sponsorId } of eventSponsorsToDelete) {
        await tx.delete(sponsors).where(eq(sponsors.id, sponsorId));
      }

      // Delete hosts and referenced persons
      const hostsToDelete = await tx.select({ personId: hosts.personId })
        .from(hosts)
        .where(eq(hosts.eventId, eventId));
      await tx.delete(hosts).where(eq(hosts.eventId, eventId));
      for (const { personId } of hostsToDelete) {
        await tx.delete(persons).where(eq(persons.id, personId));
      }

      // Delete attendees and referenced persons
      const attendeesToDelete = await tx.select({ personId: attendees.personId })
        .from(attendees)
        .where(eq(attendees.ticketStamp, event.ticketStamp));
      await tx.delete(attendees).where(eq(attendees.ticketStamp, event.ticketStamp));
      for (const { personId } of attendeesToDelete) {
        await tx.delete(persons).where(eq(persons.id, personId));
      }

      // Delete invited guests and referenced persons
      const invitedGuestsToDelete = await tx.select({ personId: invitedGuests.personId })
        .from(invitedGuests)
        .where(eq(invitedGuests.invitationStamp, event.invitationStamp));
      await tx.delete(invitedGuests).where(eq(invitedGuests.invitationStamp, event.invitationStamp));
      for (const { personId } of invitedGuestsToDelete) {
        await tx.delete(persons).where(eq(persons.id, personId));
      }

      // Finally, delete the event itself
      await tx.delete(events).where(eq(events.id, eventId));
    });

    return c.json({ message: 'Event and all related records deleted successfully!' }, 200);
  } catch (err) {
    console.error(err);
    return c.json({ message: "An error occurred while deleting the event and related records" }, 400);
  }
});

export default eventsRouter;