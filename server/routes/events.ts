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
eventsRouter.post('/', async (c) => {
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
eventsRouter.put('/:eventId', async (c) => {
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
eventsRouter.delete('/:eventId', async (c) => {
  try {
    const eventId = parseInt(c.req.param('eventId'));
    if (isNaN(eventId)) {
      return c.json({ error: 'Invalid event ID' }, 400);
    }
    const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0])
    // Delete related records
    await db.delete(eventSponsors).where(eq(eventSponsors.eventId, eventId));
    await db.delete(hosts).where(eq(hosts.eventId, eventId));
    await db.delete(attendees).where(eq(attendees.ticketStamp, event.ticketStamp));
    await db.delete(invitedGuests).where(eq(invitedGuests.invitationStamp, event.invitationStamp));
    
    // Delete the event itself
    const result = await db.delete(events).where(eq(events.id, eventId)).returning();

    if (result.length === 0) {
      return c.json({ error: 'Event not found' }, 404);
    }

    return c.json({ message: 'Event and related records deleted successfully!' });
  } catch (err) {
    console.error(err);
    return c.json({ error: "An error occurred while deleting the event." }, 400);
  }
});

export default eventsRouter;