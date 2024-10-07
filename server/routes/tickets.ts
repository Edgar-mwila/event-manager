import { Hono } from 'hono';
import { db } from '../db'; // Import your DB setup
import { insertTicketSchema, updateTicketSchema } from '../db//schemas/ticket';
import { persons, attendees } from '../db/schemas';

// Initialize router
const tickets = new Hono();

// Buy ticket route
tickets.post('/buy', async (c) => {
  try {
    const ticketData = insertTicketSchema.parse(c.req.body);

    // Check for duplicate person using email
    const existingPerson = await db.select().from(persons).where(persons.email.eq(ticketData.email));

    let personId;
    if (existingPerson.length === 0) {
      // Insert new person if no duplicates
      const [person] = await db.insert(persons).values(ticketData).returning(persons.id);
      personId = person.id;
    } else {
      personId = existingPerson[0].id;
    }

    // Insert into attendee table
    await db.insert(attendees).values({ personId, eventId: ticketData.eventId, ticketStamp: ticketData.ticketStamp });
    return c.json({ message: 'Ticket purchased successfully!' });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Return ticket route (delete)
tickets.delete('/return/:ticketId', async (c) => {
  const ticketId = c.req.param('ticketId');
  await db.delete(attendees).where(attendees.id.eq(ticketId));
  return c.json({ message: 'Ticket returned successfully!' });
});

// Edit ticket route
tickets.put('/edit/:ticketId', async (c) => {
  try {
    const ticketData = updateTicketSchema.parse(c.req.body);
    const ticketId = c.req.param('ticketId');

    // Update person and ticket details
    await db.update(persons).set(ticketData.person).where(persons.id.eq(ticketData.personId));
    await db.update(attendees).set({ ticketStamp: ticketData.ticketStamp }).where(attendees.id.eq(ticketId));

    return c.json({ message: 'Ticket updated successfully!' });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

export default tickets;
