import { createFileRoute } from '@tanstack/react-router'
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { PlusCircle, MinusCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from '@/components/ui/textarea';

const editEventSchema = z.object({
    name: z.string().min(1, "Event name is required"),
    type: z.string().min(1, "Event type is required"),
    venue: z.object({
        name: z.string().min(1, "Venue name is required"),
        province: z.string().min(1, "Province is required"),
        town: z.string().min(1, "Town is required"),
        address: z.string().min(1, "Address is required"),
        capacity: z.number().min(1, "Capacity must be at least 1"),
    }),
    sponsors: z.array(z.object({
        name: z.string().min(1, "Sponsor name is required"),
        email: z.string().email("Invalid email"),
        phone: z.string().min(10, "Phone number is required"),
        sponsorshipAgreement: z.string().min(1, "Sponsorship agreement is required"),
    })).min(1, "At least one sponsor is required"),
    host: z.object({
        firstName: z.string().min(1, "Host first name is required"),
        lastName: z.string().min(1, "Host last name is required"),
        dob: z.string().min(1, "Date of birth is required"),
        email: z.string().email("Invalid email"),
        phone: z.string().min(10, "Phone number is required"),
    }),
});

type EditEventFormData = z.infer<typeof editEventSchema>;

function EditEvent() {
    const { eventId } = Route.useParams()
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const form = useForm<EditEventFormData>({
        resolver: zodResolver(editEventSchema),
        defaultValues: {
            sponsors: [{ name: '', email: '', phone: '', sponsorshipAgreement: '' }],
        },
    });

    // Fetch event data
    const { data: eventData, isLoading: isEventLoading } = useQuery({
        queryKey: ['event', eventId],
        queryFn: async () => {
            const response = await fetch(`/api/events/${eventId}`);
            if (!response.ok) {
                throw new Error("Failed to fetch event");
            }
            return response.json();
        },
    });

    // Update form with event data when it's loaded
    useEffect(() => {
        if (eventData) {
            form.reset(eventData);
        }
    }, [eventData, form]);

    const editEventMutation = useMutation({
        mutationFn: async (data: EditEventFormData) => {
            const response = await fetch(`/api/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                throw new Error("Failed to update event");
            }

            return response.json();
        },
        onMutate: async (updatedEvent) => {
            await queryClient.cancelQueries({ queryKey: ['event', eventId] });
            const previousEvent = queryClient.getQueryData<EditEventFormData>(['event', eventId]);
            queryClient.setQueryData(['event', eventId], updatedEvent);
            return { previousEvent };
        },
        onError: (error, updatedEvent, context) => {
            if (context?.previousEvent) {
                queryClient.setQueryData(['event', eventId], context.previousEvent);
            }
            toast.error(error.message);
        },
        onSuccess: () => {
            toast.success('Event updated successfully');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['event', eventId] });
        },
    });

    const onSubmit = (data: EditEventFormData) => {
        setLoading(true);
        editEventMutation.mutate(data, {
            onSettled: () => setLoading(false),
        });
    };

    if (isEventLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="container mx-auto p-4 max-w-3xl">
            <Card>
                <CardHeader>
                    <CardTitle className="text-3xl font-bold">Edit Event</CardTitle>
                    <CardDescription>Update the details of your event</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="event-details">
                                    <AccordionTrigger>Event Details</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Event Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter event name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="type"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Event Type</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter event type" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="venue-info">
                                    <AccordionTrigger>Venue Information</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="venue.name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Venue Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter venue name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="venue.province"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Province</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter province" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="venue.town"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Town</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter town" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="venue.address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Address</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter address" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="venue.capacity"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Capacity</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" placeholder="Enter capacity" {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="sponsors">
                                    <AccordionTrigger>Sponsors</AccordionTrigger>
                                    <AccordionContent>
                                        {form.watch('sponsors').map((_, index) => (
                                            <div key={index} className="space-y-4 mb-6 p-4 border rounded-md">
                                                <FormField
                                                    control={form.control}
                                                    name={`sponsors.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sponsor Name</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter sponsor name" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`sponsors.${index}.email`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sponsor Email</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter sponsor email" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`sponsors.${index}.phone`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sponsor Phone</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Enter sponsor phone" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`sponsors.${index}.sponsorshipAgreement`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Sponsorship Agreement</FormLabel>
                                                            <FormControl>
                                                                <Textarea placeholder="Enter sponsorship agreement" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                {index > 0 && (
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => {
                                                            const currentSponsors = form.getValues('sponsors');
                                                            form.setValue('sponsors', currentSponsors.filter((_, i) => i !== index));
                                                        }}
                                                    >
                                                        <MinusCircle className="mr-2 h-4 w-4" /> Remove Sponsor
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                const currentSponsors = form.getValues('sponsors');
                                                form.setValue('sponsors', [...currentSponsors, { name: '', email: '', phone: '', sponsorshipAgreement: '' }]);
                                            }}
                                        >
                                            <PlusCircle className="mr-2 h-4 w-4" /> Add Sponsor
                                        </Button>
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="host-info">
                                    <AccordionTrigger>Host Information</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="space-y-4">
                                            <FormField
                                                control={form.control}
                                                name="host.firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>First Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter host's first name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="host.lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Last Name</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter host's last name" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="host.dob"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Date of Birth</FormLabel>
                                                        <FormControl>
                                                            <Input type="date" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="host.email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter host's email" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="host.phone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Phone</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Enter host's phone number" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>

                            <Button type="submit" disabled={loading} className="w-full">
                                {loading ? "Updating..." : "Update Event"}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}

export const Route = createFileRoute('/events//$eventId/edit')({
    component: EditEvent,
})