/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

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
  await axios.delete(`/api/tickets/${ticketId}`);
};

const deleteInvitation = async (invitationId: number) => {
  await axios.delete(`/api/invitations/${invitationId}`);
};

const updateTicket = async (ticketId: number, data: any) => {
  const response = await axios.patch(`/api/tickets/${ticketId}`, data);
  return response.data;
};

const updateInvitation = async (invitationId: number, data: any) => {
  const response = await axios.patch(`/api/invitations/${invitationId}`, data);
  return response.data;
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

  const { data: user } = useQuery(userQueryOptions);

  const { data: ticketsData } = useQuery({
    queryKey: ['tickets', eventId],
    queryFn: () => fetchTickets(eventId),
    staleTime: 1 * 60 * 1000
  });

  const { data: invitationsData } = useQuery({
    queryKey: ['invitations', eventId],
    queryFn: () => fetchInvitations(eventId),
    staleTime: 1 * 60 * 1000
  });

  const ticketDeleteMutation = useMutation<void, Error, number>({
    mutationFn: (ticketId) => deleteTicket(ticketId),
    onSuccess: (_, ticketId) => {
      queryClient.setQueryData(['tickets', eventId], (oldData: any) => ({
        tickets: oldData.tickets.filter((ticket: AttendeeDetails) => ticket.attendee.id !== ticketId),
      }));
      toast.success('Ticket deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete the ticket. Please try again.');
    },
  });

  const invitationDeleteMutation = useMutation<void, Error, number>({
    mutationFn: (invitationId) => deleteInvitation(invitationId),
    onSuccess: (_, invitationId) => {
      queryClient.setQueryData(['invitations', eventId], (oldData: any) => ({
        invitations: oldData.invitations.filter((invitation: AttendeeDetails) => invitation.attendee.id !== invitationId),
      }));
      toast.success('Invitation deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete the invitation. Please try again.');
    },
  });

  const ticketUpdateMutation = useMutation<any, Error, { ticketId: number; data: any }>({
    mutationFn: ({ ticketId, data }) => updateTicket(ticketId, data),
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['tickets', eventId], (oldData: any) => ({
        tickets: oldData.tickets.map((ticket: AttendeeDetails) =>
          ticket.attendee.id === updatedTicket.updatedAttendee.id ? { ...ticket, person: updatedTicket.updatedAttendee.person } : ticket
        ),
      }));
      toast.success('Ticket updated successfully');
    },
    onError: () => {
      toast.error('Failed to update the ticket. Please try again.');
    },
  });

  const invitationUpdateMutation = useMutation<any, Error, { invitationId: number; data: any }>({
    mutationFn: ({ invitationId, data }) => updateInvitation(invitationId, data),
    onSuccess: (updatedInvitation) => {
      queryClient.setQueryData(['invitations', eventId], (oldData: any) => ({
        invitations: oldData.invitations.map((invitation: AttendeeDetails) =>
          invitation.attendee.id === updatedInvitation.updatedGuest.id ? { ...invitation, person: updatedInvitation.updatedGuest.person } : invitation
        ),
      }));
      toast.success('Invitation updated successfully');
    },
    onError: () => {
      toast.error('Failed to update the invitation. Please try again.');
    },
  });

  if (isLoading) return <EventDetailsSkeleton />;
  if (error) return <div className="text-red-500">Error: {error.message}</div>;
  if (!eventDetails) return <div>No event data available.</div>;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row justify-between items-center mb-8">
        <h1 className="text-4xl font-bold mb-4 md:mb-0">{eventDetails.event.name}</h1>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link to={`/events/${eventId}/ticket`} params={{ eventId }}>
            <Button size="lg" className="w-full">Purchase Ticket</Button>
          </Link>
          {user && (<Link to={`/events/${eventId}/invite`} params={{ eventId }}>
            <Button size="lg" className="w-full">Invite a guest</Button>
          </Link>)}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Event Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="flex items-center mb-4">
              <Calendar className="mr-2 text-primary" size={18} />
              <strong className="mr-2">Type:</strong> {eventDetails.event.type}
            </p>
            {eventDetails.venue && (
              <>
                <p className="flex items-center mb-2">
                  <MapPin className="mr-2 text-primary" size={18} />
                  <strong className="mr-2">Venue:</strong> {eventDetails.venue.name}
                </p>
                <p className="ml-6 mb-4">
                  {eventDetails.venue.address}, {eventDetails.venue.town}, {eventDetails.venue.province}
                </p>
                <p className="flex items-center">
                  <Users className="mr-2 text-primary" size={18} />
                  <strong className="mr-2">Capacity:</strong> {eventDetails.venue.capacity}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Host & Sponsors</CardTitle>
          </CardHeader>
          <CardContent>
            {eventDetails.host && (
              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-2">Host</h3>
                <p className="flex items-center">
                  <User className="mr-2 text-primary" size={18} />
                  {eventDetails.host.firstName} {eventDetails.host.lastName}
                </p>
                <p className="ml-6">{eventDetails.host.email}</p>
                <p className="ml-6">{eventDetails.host.phone}</p>
              </div>
            )}
            {eventDetails.sponsors.length > 0 && (
              <div>
                <h3 className="text-xl font-semibold mb-2">Sponsors</h3>
                <ul className="list-disc list-inside">
                  {eventDetails.sponsors.map((sponsor, index) => (
                    <li key={index} className="mb-2">{sponsor.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {user && (
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={() => setIsAttendeeDialogOpen(true)} className="w-full sm:w-auto">
            Manage Attendees
          </Button>
          <Link to={`/events/${eventId}/edit`} params={{ eventId }}>
            <Button size="lg" className="w-full sm:w-auto">Edit Event Details</Button>
          </Link>

          <Dialog open={isAttendeeDialogOpen} onOpenChange={setIsAttendeeDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="text-2xl">Manage Event Attendees</DialogTitle>
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
                    onUpdate={(id, data) => ticketUpdateMutation.mutate({ ticketId: id, data })}
                  />
                </TabsContent>
                <TabsContent value="invitations">
                  <AttendeeTable
                    data={invitationsData?.invitations || []}
                    type="invitation"
                    onDelete={(id) => invitationDeleteMutation.mutate(id)}
                    onUpdate={(id, data) => invitationUpdateMutation.mutate({ invitationId: id, data })}
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
  data: AttendeeDetails[];
  type: 'ticket' | 'invitation';
  onDelete: (id: number) => void;
  onUpdate: (id: number, data: any) => void;
}

const AttendeeTable: React.FC<AttendeeTableProps> = ({ data, type, onDelete, onUpdate }) => {
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
          data.map((item) => (
            <TableRow key={item.attendee.id}>
              <TableCell>{item.person.firstName} {item.person.lastName}</TableCell>
              <TableCell>{item.person.email}</TableCell>
              <TableCell>{item.person.phone}</TableCell>
              <TableCell>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={() => onDelete(item.attendee.id)}>
                    <Trash2 size={16} />
                  </Button>
                  <EditAttendeePopover item={item} onUpdate={onUpdate} type={type} />
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="text-center">
              No {type === 'ticket' ? 'tickets' : 'invitations'} available.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
};

interface EditAttendeePopoverProps {
  item: AttendeeDetails;
  onUpdate: (id: number, data: any) => void;
  type: 'ticket' | 'invitation';
}

const EditAttendeePopover: React.FC<EditAttendeePopoverProps> = ({ item, onUpdate, type }) => {
  const [formData, setFormData] = useState({
    firstName: item.person.firstName,
    lastName: item.person.lastName,
    email: item.person.email,
    phone: item.person.phone,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(item.attendee.id, { person: formData });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon">
          <Edit size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Edit {type === 'ticket' ? 'Ticket' : 'Invitation'}</h4>
            <p className="text-sm text-muted-foreground">
              Update the attendee's information.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>
          </div>
          <Button type="submit" className="w-full mt-4">
            Update
          </Button>
        </form>
      </PopoverContent>
    </Popover>
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