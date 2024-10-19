'use client';

import { getAccessToken } from '@/app/auth/util';
import FriendList from '@/app/friend-list';
import { useSession } from '@/app/query-context';
import { envConfig } from '@/config/environment';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

const show = false;

export default function Page() {
	const { data, isLoading } = useSession();
	const queryClient = useQueryClient();

	const [accessToken, setAccessToken] = useState('');

	if (isLoading) {
		return (
			<div className='flex justify-center items-center w-full h-full'>
				<div className='font-bold text-xl animate-spin duration-[8080ms]'>Đang tải chờ chút</div>
			</div>
		);
	}

	if (!data || Object.keys(data).length === 0) {
		return (
			<div className='flex justify-center items-center flex-col w-full h-full font-bold text-xl text-blue-400 text-center'>
				<Link
					className='flex justify-center items-center font-bold text-xl text-blue-400 text-center'
					href={`${envConfig.backendUrl}/auth/login`}
				>
					Login vào Google đi, (Không bị mất tài khoản đâu,Ấn vào đi, Trust me bro)
				</Link>
				{show && (
					<>
						<textarea
							className='border'
							onChange={(event) => setAccessToken(event.currentTarget.value)}
						></textarea>
						<button
							onClick={() => {
								localStorage.setItem('ACCESS_TOKEN', accessToken);
								queryClient.invalidateQueries({ queryKey: ['session'] });
							}}
						>
							Set
						</button>
					</>
				)}
			</div>
		);
	}

	return <FriendList />;
}
