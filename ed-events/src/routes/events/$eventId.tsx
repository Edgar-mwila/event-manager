import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { MapPin, Users, Calendar, User } from 'lucide-react'

interface EventDetails {
  event: {
    id: number
    name: string
    type: string
    venueId: number
  }
  venue: {
    name: string
    province: string
    town: string
    address: string
    capacity: number
  } | null
  sponsors: Array<{
    name: string
  } | null>
  host: {
    firstName: string
    lastName: string
  } | null
}

const fetchEventDetails = async (eventId: string): Promise<EventDetails> => {
  const response = await axios.get(`/api/events/${eventId}`)
  return response.data
}

const EventDetailsPage = () => {
  const { eventId } = Route.useParams()
  const { data, isLoading, error } = useQuery<EventDetails, Error>({
    queryKey: ['eventDetails', eventId],
    queryFn: () => fetchEventDetails(eventId),
  })

  if (isLoading) return <EventDetailsSkeleton />
  if (error) return <div className="text-red-500">Error: {error.message}</div>
  if (!data) return <div>No event data available.</div>

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">{data.event.name}</h1>
        <Link
          to={`/events/${eventId}/ticket`}
          params={{ eventId: eventId }}
        >
          <Button size="lg">Purchase Ticket</Button>
        </Link>
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">Event Details</h2>
              <p className="flex items-center mb-2">
                <Calendar className="mr-2" size={18} />
                <strong>Type:</strong> {data.event.type}
              </p>
              {data.venue && (
                <>
                  <p className="flex items-center mb-2">
                    <MapPin className="mr-2" size={18} />
                    <strong>Venue:</strong> {data.venue.name}
                  </p>
                  <p className="ml-6 mb-2">{data.venue.address}, {data.venue.town}, {data.venue.province}</p>
                  <p className="flex items-center">
                    <Users className="mr-2" size={18} />
                    <strong>Capacity:</strong> {data.venue.capacity}
                  </p>
                </>
              )}
            </div>
            <div>
              {data.host && (
                <div className="mb-4">
                  <h2 className="text-2xl font-semibold mb-2">Host</h2>
                  <p className="flex items-center">
                    <User className="mr-2" size={18} />
                    {data.host.firstName} {data.host.lastName}
                  </p>
                </div>
              )}
              {data.sponsors.length > 0 && (
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Sponsors</h2>
                  <ul className="list-disc list-inside">
                    {data.sponsors.map((sponsor, index) =>
                      sponsor && <li key={index}>{sponsor.name}</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Link
          to={`/events/${eventId}/ticket`}
          params={{ eventId: eventId }}
        >
          <Button size="lg">Purchase Ticket</Button>
        </Link>
      </div>
    </div>
  )
}

const EventDetailsSkeleton = () => (
  <div className="container mx-auto px-4 py-12">
    <div className="flex justify-between items-center mb-8">
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-10 w-40" />
    </div>
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-6 w-5/6" />
          </div>
          <div>
            <Skeleton className="h-8 w-1/2 mb-4" />
            <Skeleton className="h-6 w-full mb-2" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        </div>
      </CardContent>
    </Card>
    <div className="text-center">
      <Skeleton className="h-10 w-40 mx-auto" />
    </div>
  </div>
)

export const Route = createFileRoute('/events/$eventId')({
  component: EventDetailsPage,
})

export default EventDetailsPage