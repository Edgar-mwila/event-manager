import { Router } from 'hono';
import { db } from './db';
import { insertEventSchema, updateEventSchema } from './schemas/event';
import { events, venues, sponsors, hosts, persons, attendees } from './db/tables';

// Initialize router
const eventsRouter = new Router();

// List all events
eventsRouter.get('/', async (c) => {
  const allEvents = await db.select().from(events);
  return c.json(allEvents);
});

// Get event details
eventsRouter.get('/:eventId', async (c) => {
  const eventId = c.req.param('eventId');

  // Join to get venue, sponsor, and host details
  const eventDetails = await db
    .select()
    .from(events)
    .where(events.id.eq(eventId))
    .leftJoin(venues, venues.id.eq(events.venueId))
    .leftJoin(sponsors, sponsors.eventId.eq(events.id))
    .leftJoin(hosts, hosts.eventId.eq(events.id))
    .leftJoin(persons, persons.id.eq(hosts.personId));

  // Join to get attendees for the event
  const attendeesDetails = await db
    .select(persons)
    .from(attendees)
    .where(attendees.eventId.eq(eventId))
    .innerJoin(persons, persons.id.eq(attendees.personId));

  return c.json({
    ...eventDetails[0],
    attendees: attendeesDetails.map((attendee) => attendee.person),
  });
});

// Create new event
eventsRouter.post('/', async (c) => {
  try {
    const eventData = insertEventSchema.parse(c.req.body);

    // Check and create venue if necessary
    const [venue] = await db.insert(venues).values(eventData.venue).onConflict('id').ignore().returning(venues.id);
    const venueId = venue.id;

    // Insert event
    const [event] = await db.insert(events).values({ ...eventData, venueId }).returning(events.id);
    const eventId = event.id;

    // Insert sponsors
    await db.insert(sponsors).values(eventData.sponsors.map(sponsor => ({ ...sponsor, eventId })));

    return c.json({ message: 'Event created successfully!', eventId });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Edit event
eventsRouter.put('/edit/:eventId', async (c) => {
  try {
    const eventData = updateEventSchema.parse(c.req.body);
    const eventId = c.req.param('eventId');

    await db.update(events).set(eventData).where(events.id.eq(eventId));
    return c.json({ message: 'Event updated successfully!' });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Delete event
eventsRouter.delete('/delete/:eventId', async (c) => {
  const eventId = c.req.param('eventId');
  await db.delete(events).where(events.id.eq(eventId));
  return c.json({ message: 'Event deleted successfully!' });
});

export default eventsRouter;
