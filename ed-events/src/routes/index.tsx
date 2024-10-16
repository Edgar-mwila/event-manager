import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Calendar, Users, Music, LucideIcon, LogIn, LogOut } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { userQueryOptions } from '@/api';

interface EventCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const EventCard: React.FC<EventCardProps> = ({ icon: Icon, title, description }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <Card className="h-full hover:shadow-lg transition-shadow duration-300">
      <CardContent className="flex flex-col items-center p-6 text-center">
        <Icon className="mb-4 h-12 w-12 text-primary" />
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
      </CardContent>
    </Card>
  </motion.div>
);

const fetchTotalEvents = async () => {
  const response = await fetch('/api/events/total');
  return response.json()
}

const EdEventsLandingPage = () => {
  const { data: user } = useQuery(userQueryOptions);
  const {
    data: eventsCount,
    isLoading,
    error,
  } = useQuery<{totalEvents: number}, Error>({
    queryKey: ['events'],
    queryFn: fetchTotalEvents,
  })
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-100 to-pink-100">
      <nav className="bg-white shadow-md p-4">
        <div className="container mx-auto flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-primary">ed-Events</Link>
          <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
            {user ? 
              <a href='/api/logout' className='flex flex-row justify-center'>
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
              </a>
            : 
              <a href='/api/login' className='flex flex-row justify-center'>
                <LogIn className="mr-2 h-4 w-4" />
                Staff Login
              </a>}
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : -50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl font-bold mb-4 text-primary">Welcome to ed-Events</h1>
          <p className="text-2xl text-gray-700 mb-8">Discover extraordinary events that ignite your passion!</p>
          <Link to="/events">
            <Button size="lg" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
              Join an Event
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.9 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl font-semibold text-primary mb-2">Discover {isLoading ? "5": error ? "5" : eventsCount?.totalEvents}+ Amazing Events</h2>
          <p className="text-xl text-gray-600">Join thousands of attendees in unforgettable experiences</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <EventCard
            icon={Calendar}
            title="Diverse Selection"
            description="From tech conferences to art exhibitions, we've got something for everyone."
          />
          <EventCard
            icon={Users}
            title="Networking Opportunities"
            description="Connect with like-minded individuals and industry experts."
          />
          <EventCard
            icon={Music}
            title="Unforgettable Experiences"
            description="Create lasting memories with our curated selection of events."
          />
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: isVisible ? 1 : 0, scale: isVisible ? 1 : 0.5 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-16 text-center bg-white p-10 rounded-lg shadow-xl"
        >
          <h2 className="text-4xl font-semibold mb-4 text-primary">Ready to embark on your next adventure?</h2>
          <Link to="/events">
            <Button size="lg" variant="outline" className="group bg-primary text-white hover:bg-primary-dark transition-colors duration-300">
              Explore Events
              <motion.span
                className="inline-block ml-2"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                🎉
              </motion.span>
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export const Route = createFileRoute('/')({
  component: EdEventsLandingPage,
})