/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

const formSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number is required'),
})

const purchaseTicket = async (
  eventId: string,
  data: z.infer<typeof formSchema>,
) => {
  const response = await axios.post(`/api/events/${eventId}/ticket`, data)
  return response.data
}

const TicketPurchasePage = () => {
  const queryClient = useQueryClient();
  const { eventId } = Route.useParams()
  const navigate = useNavigate()
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dob: '',
      email: '',
      phone: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: z.infer<typeof formSchema>) =>
      purchaseTicket(eventId, data),
    onSuccess: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['tickets', eventId] });

      queryClient.setQueryData(['tickets', eventId], (oldData: any) => ({
        tickets: [...(oldData?.tickets || []), data], // Optimistically add the new ticket
      }));

      toast('Ticket Purchased', {
        description: 'Your ticket has been successfully purchased.',
      })
      navigate({ to: '/events/$eventId', params: { eventId } })
    },
    onError: (error) => {
      toast('Error', {
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while purchasing the ticket.',
      })
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    mutation.mutate(data)
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Purchase Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="YYYY-MM-DD" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-center">
                <Button type="submit" size="lg" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Purchasing...' : 'Purchase Ticket'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export const Route = createFileRoute('/events//$eventId/ticket')({
  component: TicketPurchasePage,
})
