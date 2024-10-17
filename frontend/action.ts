'use server';

import { envConfig } from '@/config/environment';
import { redirect } from 'next/navigation';

export async function createRoom(formData: FormData) {
	'use server';

	const result = await fetch(`${envConfig.backendUrl}/room`, { method: 'POST', body: formData });

	if (result.ok) {
		redirect(`/calls/${formData.get('room_id')}`);
	}

	return { error: await result.text() };
}
