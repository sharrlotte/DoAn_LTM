'use client';

import { getAccessToken } from '@/app/auth/page';
import FriendList from '@/app/friend-list';
import { envConfig } from '@/config/environment';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

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

export default function Page() {
	const { data, isLoading } = useSession();

	if (isLoading) {
		return (
			<div className='flex justify-center items-center w-full h-full'>
				<div className='font-bold text-xl animate-spin duration-[5000ms]'>Đang tải chờ chút</div>
			</div>
		);
	}

	if (!data || Object.keys(data).length === 0) {
		return (
			<Link
				className='flex justify-center items-center w-full h-full font-bold text-xl text-blue-400 text-center'
				href={`${envConfig.backendUrl}/auth/login`}
			>
				Login vào Google đi, (Không bị mất tài khoản đâu,Ấn vào đi, Trust me bro)
			</Link>
		);
	}

	return <FriendList />;
}
