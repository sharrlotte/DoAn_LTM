'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { useEffect } from 'react';

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
