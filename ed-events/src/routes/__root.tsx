import {createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router'
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'
import { type QueryClient } from '@tanstack/react-query';
import { Toaster } from "@/components/ui/sonner"


interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: Root,
})

function NavBar() {
  return (
      <div className='p-2 flex justify-between max-w-3xl m-auto items-baseline'>
        <Link to="/" className="text-2xl font-bold">
          Ed Events
        </Link>
        <div className="flex gap-2">
          <Link to="/events" className="[&.active]:font-bold">
            See our Events
          </Link>{'   '}
        </div>
      </div>
  )
}

function Root() {
  return (
    <>
      <NavBar />
      <hr />
      <div className='max-w-2xl m-auto'>
        <Outlet />
      </div>
      <Toaster />
    </>
  )
}