import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Users, Calendar, User, Trash2, Edit } from 'lucide-react';
import { userQueryOptions } from '@/api';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EventDetails {
  event: {
    id: number;
    name: string;
    type: string;
    venueId: number;
    ticketStamp: string;
    invitationStamp: string;
  };
  venue: {
    name: string;
    province: string;
    town: string;
    address: string;
    capacity: number;
  } | null;
  sponsors: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  host: {
    firstName: string;
    lastName: string;
    dob: string;
    email: string;
    phone: string;
  } | null;
}

interface AttendeeDetails {
  attendee: {
    id: number;
  };
  person: {
    phone: string;
    firstName: string;
    lastName: string;
    email: string;
  };
} 

const fetchEventDetails = async (eventId: string): Promise<EventDetails> => {
  const response = await fetch(`/api/events/${eventId}`);
  return response.json();
};

const fetchTickets = async (eventId: string): Promise<{ tickets: AttendeeDetails[] }> => {
  const response = await fetch(`/api/events/${eventId}/tickets`);
  return response.json();
};

const fetchInvitations = async (eventId: string): Promise<{ invitations: AttendeeDetails[] }> => {
  const response = await fetch(`/api/events/${eventId}/invites`);
  return response.json();
};

const deleteTicket = async (ticketId: number) => {
  await axios.delete(`/api/${ticketId}`);
};

const deleteInvitation = async (invitationId: number) => {
  await axios.delete(`/api/${invitationId}`);
};

const EventDetailsPage = () => {
  const { eventId } = Route.useParams();
  const queryClient = useQueryClient();
  const [isAttendeeDialogOpen, setIsAttendeeDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeTab, setActiveTab] = useState<'tickets' | 'invitations'>('tickets');

  const { data: eventDetails, isLoading, error } = useQuery<EventDetails, Error>({
    queryKey: ['eventDetails', eventId],
    queryFn: () => fetchEventDetails(eventId),
  });
  console.log(eventDetails);

  const { data: user } = useQuery(userQueryOptions);

  const { data: ticketsData } = useQuery({queryKey: ['tickets', eventId],queryFn: () => fetchTickets(eventId)});

  const { data: invitationsData } = useQuery({queryKey: ['invitations', eventId],queryFn: () => fetchInvitations(eventId)});

  const ticketDeleteMutation = useMutation<void, Error, number>({
    mutationFn: (ticketId) => deleteTicket(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['tickets', eventId], 
        exact: true,
      });
      toast('Ticket deleted successfully', { description: 'The ticket has been removed from the event.' });
    },
    onError: () => {
      toast('Error', { description: 'Failed to delete the ticket. Please try again.' });
    },
  });

  const invitationDeleteMutation = useMutation<void, Error, number>({
    mutationFn: (invitationId) => deleteInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['invitations', eventId], 
        exact: true,
      });
      toast('Invitation deleted successfully', { description: 'The invitation has been removed from the event.' });
    },
    onError: () => {
      toast('Error', { description: 'Failed to delete the invitation. Please try again.' });
    },
  });

  if (isLoading) return <EventDetailsSkeleton />;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;
  if (!eventDetails) return <div>No event data available.</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">{eventDetails.event.name}</h1>
        <Link to={`/events/${eventId}/ticket`} params={{ eventId }}>
          <Button size="lg">Purchase Ticket</Button>
        </Link>
        <Link to={`/events/${eventId}/invite`} params={{ eventId }}>
          <Button size="lg">Invite a guest</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center mb-2">
              <Calendar className="mr-2" size={18} />
              <strong>Type:</strong> {eventDetails.event.type}
            </p>
            {eventDetails.venue && (
              <>
                <p className="flex items-center mb-2">
                  <MapPin className="mr-2" size={18} />
                  <strong>Venue:</strong> {eventDetails.venue.name}
                </p>
                <p className="ml-6 mb-2">
                  {eventDetails.venue.address}, {eventDetails.venue.town}, {eventDetails.venue.province}
                </p>
                <p className="flex items-center">
                  <Users className="mr-2" size={18} />
                  <strong>Capacity:</strong> {eventDetails.venue.capacity}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Host & Sponsors</CardTitle>
          </CardHeader>
          <CardContent>
            {eventDetails.host && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Host</h3>
                <p className="flex items-center">
                  <User className="mr-2" size={18} />
                  {eventDetails.host.firstName} {eventDetails.host.lastName}
                </p>
              </div>
            )}
            {eventDetails.sponsors.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Sponsors</h3>
                <ul className="list-disc list-inside">
                  {eventDetails.sponsors.map((sponsor, index) => (
                    <li key={index}>{sponsor.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user && (
        <div className="mt-8">
          <Button size="lg" onClick={() => setIsAttendeeDialogOpen(true)} className="w-full md:w-auto">
            Manage Attendees
          </Button>

          <Dialog open={isAttendeeDialogOpen} onOpenChange={setIsAttendeeDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Manage Event Attendees</DialogTitle>
                <DialogDescription>View and manage tickets and invitations for this event.</DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="tickets" onValueChange={(value) => setActiveTab(value as 'tickets' | 'invitations')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tickets">Tickets</TabsTrigger>
                  <TabsTrigger value="invitations">Invitations</TabsTrigger>
                </TabsList>
                <TabsContent value="tickets">
                  <AttendeeTable
                    data={ticketsData?.tickets || []}
                    type="ticket"
                    onDelete={(id) => ticketDeleteMutation.mutate(id)}
                  />
                </TabsContent>
                <TabsContent value="invitations">
                  <AttendeeTable
                    data={invitationsData?.invitations || []}
                    type="invitation"
                    onDelete={(id) => invitationDeleteMutation.mutate(id)}
                  />
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

interface AttendeeTableProps {
  data: (AttendeeDetails)[];
  type: 'ticket' | 'invitation';
  onDelete: (id: number) => void;
}

const AttendeeTable: React.FC<AttendeeTableProps> = ({ data, type, onDelete }) => {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((item, index) => (
            <TableRow key={index}>
              <TableCell>{item.person.firstName} {item.person.lastName}</TableCell>
              <TableCell>{item.person.email}</TableCell>
              <TableCell>{item.person.phone}</TableCell>
              <TableCell>
                <Button variant="outline" size="icon" onClick={() => onDelete(item.attendee.id)}>
                  <Trash2 size={16} />
                </Button>
                <Button variant="outline" size="icon" className="ml-2">
                  <Edit size={16} />
                </Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="text-center">
              No {type === 'ticket' ? 'tickets' : 'invitations'} available.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

const EventDetailsSkeleton = () => (
  <div className="container mx-auto px-4 py-12">
    <Skeleton className="h-12 w-64 mb-8" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
    <Skeleton className="h-12 w-48 mt-8" />
  </div>
);

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailsPage,
});