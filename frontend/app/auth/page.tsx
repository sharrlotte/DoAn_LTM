'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import React, { Suspense, useEffect } from 'react';

export default function Page() {
	return (
		<Suspense>
			<Search />
		</Suspense>
	);
}

function Search() {
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
