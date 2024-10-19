'use client';

import { getAccessToken } from '@/app/auth/util';
import { envConfig } from '@/config/environment';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React, { ReactNode } from 'react';

export default function QueryContext({ children }: { children: ReactNode }) {
	const [queryClient] = React.useState(() => new QueryClient());

	return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export const useSession = () =>
	useQuery({
		queryFn: () =>
			fetch(`${envConfig.backendUrl}/auth/session`, {
				headers: {
					Authorization: getAccessToken(),
				},
				cache: 'no-cache',
			}).then((result) => {
				if (result.ok) return result.json();
				return null;
			}),
		queryKey: ['session'],
	});
