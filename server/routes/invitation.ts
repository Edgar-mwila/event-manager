import { Router } from 'hono';
import { db } from './db';
import { insertInvitationSchema, updateInvitationSchema } from './schemas/invitation';
import { persons, invitedGuests } from './db/tables';

// Initialize router
const invitations = new Router();

// Send invitation route
invitations.post('/send', async (c) => {
  try {
    const invitationData = insertInvitationSchema.parse(c.req.body);

    // Check for duplicate person using email
    const existingPerson = await db.select().from(persons).where(persons.email.eq(invitationData.email));

    let personId;
    if (existingPerson.length === 0) {
      // Insert new person if no duplicates
      const [person] = await db.insert(persons).values(invitationData).returning(persons.id);
      personId = person.id;
    } else {
      personId = existingPerson[0].id;
    }

    // Insert into invited_guest table
    await db.insert(invitedGuests).values({ personId, eventId: invitationData.eventId, invitationStamp: invitationData.invitationStamp });
    return c.json({ message: 'Invitation sent successfully!' });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Cancel invitation route (delete)
invitations.delete('/cancel/:invitationId', async (c) => {
  const invitationId = c.req.param('invitationId');
  await db.delete(invitedGuests).where(invitedGuests.id.eq(invitationId));
  return c.json({ message: 'Invitation cancelled successfully!' });
});

// Edit invitation route
invitations.put('/edit/:invitationId', async (c) => {
  try {
    const invitationData = updateInvitationSchema.parse(c.req.body);
    const invitationId = c.req.param('invitationId');

    // Update person and invitation details
    await db.update(persons).set(invitationData.person).where(persons.id.eq(invitationData.personId));
    await db.update(invitedGuests).set({ invitationStamp: invitationData.invitationStamp }).where(invitedGuests.id.eq(invitationId));

    return c.json({ message: 'Invitation updated successfully!' });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

export default invitations;
