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
import { z } from 'zod';
import { invitedGuests } from '../db/schemas/invited_guest';
import { getUser } from '../kinde';

// Initialize router
const eventsRouter = new Hono();

// List all events
eventsRouter.get('/', async (c) => {
  const allEvents = await db.select().from(events);
  return c.json(allEvents);
});

// Get event details
eventsRouter.get('/:eventId', async (c) => {
  const eventId = parseInt(c.req.param('eventId'));
  if (isNaN(eventId)) {
    return c.json({ error: 'Invalid event ID' }, 400);
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
    return c.json({ error: 'Event not found' }, 404);
  }

  return c.json({
    event: eventDetails[0].event,
    venue: eventDetails[0].venue,
    sponsors: eventDetails.filter(row => row.sponsors).map(row => row.sponsors),
    host: eventDetails[0].host
  });
});

// Create new event
eventsRouter.post('/', getUser, async (c) => {
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
      return c.json({ error: "Could not find or create venue." }, 400);
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
      return c.json({ error: "Could not find or create host." }, 400);
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

    return c.json({ message: "Event created successfully!", eventId: event.id });
  } catch (err) {
    console.error(err);
    return c.json({ error: "An error occurred while creating the event." }, 400);
  }
});

// Edit event
eventsRouter.put('/:eventId', getUser, async (c) => {
  try {
    const eventId = parseInt(c.req.param('eventId'));
    if (isNaN(eventId)) {
      return c.json({ error: 'Invalid event ID' }, 400);
    }

    const eventData = insertEventSchema.parse(await c.req.json());

    await db.update(events).set(eventData).where(eq(events.id, eventId));
    return c.json({ message: 'Event updated successfully!' });
  } catch (err) {
    console.error(err);
    return c.json({ error: "An error occurred while updating the event." }, 400);
  }
});

// Delete event
eventsRouter.delete('/:eventId', getUser, async (c) => {
  try {
    const eventId = parseInt(c.req.param('eventId'));
    if (isNaN(eventId)) {
      return c.json({ error: 'Invalid event ID' }, 400);
    }

    // Fetch the event
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
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

    return c.json({ message: 'Event and all related records deleted successfully!' });
  } catch (err) {
    console.error(err);
    return c.json({ error: "An error occurred while deleting the event and related records." }, 400);
  }
});

export default eventsRouter;