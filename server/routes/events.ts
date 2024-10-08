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

// Initialize router
const eventsRouter = new Hono();

// List all events
eventsRouter.get('/', async (c) => {
  const allEvents = await db.select().from(events);
  return c.json(allEvents);
});

// Get event details
eventsRouter.get('/:eventId', async (c) => {
  const eventId = c.req.param('eventId') as unknown as number;
  const event = await db.select().from(events).where(eq(events.id, eventId)).then((res) => res[0]);
  // Join to get venue, sponsor, and host details
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
    .leftJoin(eventSponsors, eq(eventSponsors.eventId, events.id)) // Map sponsor IDs to event
    .leftJoin(sponsors, eq(sponsors.id, eventSponsors.sponsorId))
    .leftJoin(hosts, eq(hosts.eventId, events.id))
    .leftJoin(persons, eq(persons.id, hosts.personId)); // Host person details

  // Handle no result case
  if (!eventDetails || eventDetails.length === 0) {
    return c.json({ message: 'Event not found' }, 404);
  }

  return c.json({
    event: eventDetails[0].event,
    venue: eventDetails[0].venue,
    sponsors: eventDetails.map(row => row.sponsors),
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
        sponsorShipAgreement: z.string(),
      })),
    })
    // Parse event data
    const eventData = extendedInsertEventSchema.parse(await c.req.json());

    // Insert or find venue
    const [venue] = await db
      .insert(venues)
      .values(eventData.venue)
      .onConflictDoNothing()
      .returning({ id: venues.id });
    const venueId = venue?.id ?? null; // Handle if no venue is returned

    const insertedSponsors = await db
  .insert(sponsors)
  .values(
    eventData.sponsors.map(sponsor => ({
      name: sponsor.name,
      email: sponsor.email,
      phone: sponsor.phone,
    }))
  )
  .onConflictDoNothing()
  .returning({ id: sponsors.id, name: sponsors.name });

// Create a map of sponsor names to their IDs
const sponsorNameToIdMap = new Map(
  insertedSponsors.map(sponsor => [sponsor.name, sponsor.id])
);

// Insert event with the retrieved venueId
const [event] = await db
  .insert(events)
  .values({ ...eventData, venueId })
  .returning({ id: events.id });
const eventId = event.id;

// Insert eventSponsors with correct sponsor IDs
await db.insert(eventSponsors).values(
  eventData.sponsors.map(sponsor => ({
    sponsorId: sponsorNameToIdMap.get(sponsor.name) as number,
    eventId,
    sponsorshipAgreement: sponsor.sponsorShipAgreement,
  }))
);

    return c.json({ message: 'Event created successfully!', eventId });
  } catch (err) {
    return c.json({ error: err }, 400);
  }
});


// Edit event
eventsRouter.put('/edit/:eventId', async (c) => {
  try {
    const eventData = insertEventSchema.parse(c.req);
    const eventId = c.req.param('eventId') as unknown as number;

    await db.update(events).set(eventData).where(eq(events.id, eventId));
    return c.json({ message: 'Event updated successfully!' });
  } catch (err) {
    return c.json({ error: err }, 400);
  }
});

// Delete event
eventsRouter.delete('/delete/:eventId', async (c) => {
  const eventId = c.req.param('eventId') as unknown as number;
  await db.delete(events).where(eq(events.id, eventId));
  return c.json({ message: 'Event deleted successfully!' });
});

export default eventsRouter;
