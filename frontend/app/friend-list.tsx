'use client';

import { AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar } from '@radix-ui/react-avatar';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { envConfig } from '@/config/environment';
import { getAccessToken } from '@/app/auth/util';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useState } from 'react';
import { socket } from '@/config/socket';
import { useRouter } from 'next/navigation';
import { useSession } from '@/app/query-context';

export default function FriendList() {
	const { data: session } = useSession();
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryFn: () =>
			fetch(`${envConfig.backendUrl}/friends`, {
				headers: {
					Authorization: getAccessToken(),
				},
				cache: 'no-cache',
			}).then((r) => r.json()),
		queryKey: ['friends'],
	});

	useEffect(() => {
		function onConnect() {
			socket.emit('join-room', { room_id: session.id });
			console.log('Request join room: ' + session.id + ' in friend list');
		}

		function onEnterCall(data: any) {
			console.log('User ' + data.name + ' is calling');

			router.push(`/rooms/${session.id}`);
		}

		if (session) {
			socket.connect();

			socket.on('connect', onConnect);
			socket.on('enter-call', onEnterCall);
		}

		return () => {
			socket.off('connect', onConnect);
			socket.off('enter-call', onEnterCall);
		};
	}, [session]);

	return (
		<div className='flex-col items-center gap-x-5 sticky w-full py-2 px-4 rounded-2xl shadow-3xl z-40 bg-white gap-2 grid'>
			<div className='flex items-center gap-x-5 sticky w-full py-2 px-4 rounded-2xl shadow-3xl z-40'>
				<Link
					className='text-3xl font-extrabold text-nowrap text-black'
					href='/'
				>
					Video Call
				</Link>

				<div className='flex w-full items-center gap-2 rounded-2xl'>
					<div className='absolute w-full flex items-center ps-3 pointer-events-none'>
						<svg
							className='w-4 h-4 text-gray-500 dark:text-gray-400'
							aria-hidden='true'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 20 20'
						>
							<path
								stroke='currentColor'
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z'
							/>
						</svg>
					</div>
					<input
						className='rounded-2xl block w-full h-10 p-2 ps-10 text-sm text-gray-900 border border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
						placeholder='Tìm kiếm '
						required
					/>
				</div>

				<div className='flex items-center gap-2 h-auto  rounded-full '>
					<Avatar className='size-12'>
						<AvatarImage
							className='rounded-full size-12'
							src={session?.avatar}
						/>
						<AvatarFallback>{session?.name?.slice(0, 2)}</AvatarFallback>
					</Avatar>
					<Button
						onClick={() => {
							localStorage.setItem('ACCESS_TOKEN', '');
							queryClient.invalidateQueries({ queryKey: ['session'] });
						}}
					>
						LogOut
					</Button>
				</div>
			</div>
			<div className='flex w-full'>
				<Add />
			</div>
			<div className='gap-2 grid'>
				{isLoading
					? Array(20)
							.fill(1)
							.map((_, index) => (
								<Skeleton
									className='w-full h-12'
									key={index}
								/>
							))
					: data?.friends.map((friend: any) => (
							<div
								key={friend.id}
								className='grid grid-cols-[32px_auto_60px] gap-2 bg-muted p-2 rounded-md items-center w-full'
							>
								<Avatar className='size-8'>
									<AvatarImage
										className='rounded-full size-8'
										src={friend.avatar}
									/>
									<AvatarFallback>{friend.name?.slice(0, 2)}</AvatarFallback>
								</Avatar>
								<span>{friend.name}</span>
								<Link
									className='gap-2'
									href={`/rooms/${friend.id}`}
									onClick={() => socket.emit('join-room', { room_id: friend.id })}
								>
									Gọi
								</Link>
							</div>
					  ))}
			</div>
		</div>
	);
}

function Add() {
	const [name, setName] = useState('');
	const { data: session } = useSession();

	const { data } = useQuery({
		queryFn: () =>
			fetch(`${envConfig.backendUrl}/users?name=${name}`, {
				headers: {
					Authorization: getAccessToken(),
				},
				cache: 'no-cache',
			}).then((r) => r.json()),
		queryKey: ['users', name],
	});

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className='items-end'>Thêm Liên Hệ</Button>
			</DialogTrigger>
			<DialogContent className='sm:max-w-[425px]'>
				<DialogHeader>
					<DialogTitle>Thông tin liên hệ</DialogTitle>
				</DialogHeader>
				<div className='grid gap-4 py-4'>
					<div className='flex w-full items-center gap-2 rounded-2xl'>
						<div className='absolute w-full flex items-center ps-3 pointer-events-none'>
							<svg
								className='w-4 h-4 text-gray-500 dark:text-gray-400'
								aria-hidden='true'
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 20 20'
							>
								<path
									stroke='currentColor'
									strokeLinecap='round'
									strokeLinejoin='round'
									strokeWidth='2'
									d='m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z'
								/>
							</svg>
						</div>
						<input
							className='rounded-2xl block w-full h-10 p-2 ps-10 text-sm text-gray-900 border border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500'
							placeholder=''
							value={name}
							onChange={(event) => setName(event.currentTarget.value)}
						/>
					</div>
					<div className='grid w-full gap-1'>
						{data?.users
							.filter((u: any) => u.id !== session.id)
							.map((user: any) => (
								<FriendCard
									key={user.id}
									user={user}
								/>
							))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function FriendCard({ user }: { user: any }) {
	const queryClient = useQueryClient();
	const [add, setAdd] = useState(false);

	const { mutate, isPending } = useMutation({
		mutationFn: (friend_id: string) =>
			fetch(`${envConfig.backendUrl}/friends`, {
				headers: {
					Authorization: getAccessToken(),
					'Content-type': 'application/json',
				},
				method: 'POST',
				body: JSON.stringify({ friend_id }),
				cache: 'no-cache',
			}).then((r) => r.json()),
		mutationKey: ['add-friend'],
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['friends'] });
			queryClient.invalidateQueries({ queryKey: ['users'] });
			setAdd(true);
		},
	});

	return (
		<div className='flex gap-2 w-full bg-muted px-2 py-1 items-center rounded-sm'>
			<Avatar className='size-8'>
				<AvatarImage
					className='rounded-full size-8'
					src={user.avatar}
				/>
				<AvatarFallback>{(user.name as string).slice(0, 2)}</AvatarFallback>
			</Avatar>
			<div className='bold'>{user.name}</div>
			<Button
				className='ml-auto'
				variant='ghost'
				onClick={() => mutate(user.id)}
			>
				{isPending ? (
					<div
						role='status'
						className='size-8'
					>
						<svg
							aria-hidden='true'
							className='w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600'
							viewBox='0 0 100 101'
							fill='none'
							xmlns='http://www.w3.org/2000/svg'
						>
							<path
								d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z'
								fill='currentColor'
							/>
							<path
								d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z'
								fill='currentFill'
							/>
						</svg>
						<span className='sr-only'>Loading...</span>
					</div>
				) : add ? (
					'Đã thêm'
				) : (
					'Thêm'
				)}
			</Button>
		</div>
	);
}
