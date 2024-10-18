'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';

export function getAccessToken() {
	return 'Bearer ' + (localStorage.getItem('ACCESS_TOKEN') as string) || '';
}

export default function Page() {
	const query = useSearchParams();
	const router = useRouter();

	const accessToken = query.get('accessToken');

	useEffect(() => {
		if (accessToken) {
			localStorage.setItem('ACCESS_TOKEN', accessToken);
		}

		router.replace('/');
	}, []);

	return <div></div>;
}
