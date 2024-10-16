import { queryOptions } from '@tanstack/react-query';

type user = {
    id: string,
    email: string,
    given_name: string | null,
    family_name: string | null,
    email_verified: boolean,
    preferred_username: string | null,
    name: string,
    picture: string,
    updated_at: number,
    sub: string
}

async function fetchMe() {
    const res = await fetch('/api/me');
    if(!res.ok){
        throw new Error("server error");
    }
    const data = await res.json();
    return data as user;
}
export const userQueryOptions = queryOptions({queryKey: ['get-profile'], queryFn: fetchMe, staleTime: Infinity})