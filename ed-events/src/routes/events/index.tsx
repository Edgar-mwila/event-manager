import React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface Event {
  id: number
  name: string
  type: string
}

const fetchEvents = async (): Promise<Event[]> => {
  const response = await fetch('/api/events');
  return response.json()
}

const EventCard: React.FC<{ event: Event }> = ({ event }) => (
  <Card className="hover:shadow-lg transition-shadow h-full">
    <CardContent className="p-6 flex flex-col justify-between h-full">
      <div className='w-full mx-auto'>
        <h2 className="text-2xl font-bold mb-2 line-clamp-2">{event.name}</h2>
        <Badge variant="secondary" className="text-sm">
          {event.type}
        </Badge>
      </div>
    </CardContent>
  </Card>
)

const EventsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {[...Array(6)].map((_, index) => (
      <Card key={index} className="h-[150px]">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/3" />
        </CardContent>
      </Card>
    ))}
  </div>
)

const AllEvents: React.FC = () => {
  const {
    data: events,
    isLoading,
    error,
  } = useQuery<Event[], Error>({
    queryKey: ['events'],
    queryFn: fetchEvents,
    staleTime: 5 * 60 * 1000,
  })

  if (isLoading) return <EventsSkeleton />
  if (error) return <div className="text-red-500">Error: {error.message}</div>

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Upcoming Events</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {events?.map((event) => (
          <Link
            key={event.id}
            to="/events/$eventId"
            params={{ eventId: event.id.toString() }}
            className="block h-full"
          >
            <EventCard event={event} />
          </Link>
        ))}
      </div>
    </div>
  )
}

export const Route = createFileRoute('/events/')({
  component: AllEvents,
})

export default AllEvents