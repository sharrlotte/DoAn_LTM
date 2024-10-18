'use client';

import { AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar } from '@radix-ui/react-avatar';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { envConfig } from '@/config/environment';
import { getAccessToken } from '@/app/auth/page';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';
import { useSession } from '@/app/page';

export default function FriendList() {
	const { data: session } = useSession();

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

	return (
		<div className='flex-col items-center gap-x-5 sticky w-full top-4 py-2 px-4 rounded-2xl shadow-3xl z-40 bg-white gap-2 grid'>
			<div className='flex items-center gap-x-5 sticky w-full top-4 py-2 px-4 rounded-2xl shadow-3xl z-40'>
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

				<div className='flex h-auto  rounded-full '>
					<Avatar className='size-12'>
						<AvatarImage
							className='rounded-full size-12'
							src={session?.avatar}
						/>
						<AvatarFallback>CN</AvatarFallback>
					</Avatar>
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
							<div className='grid grid-cols-[32px_auto_60px] gap-2 bg-muted p-2 rounded-md items-center w-full'>
								<Avatar className='size-8'>
									<AvatarImage
										className='rounded-full size-8'
										src={friend.avatar}
									/>
									<AvatarFallback>CN</AvatarFallback>
								</Avatar>
								<span>{friend.name}</span>
								<Button className='gap-2'>Gọi</Button>
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
								<div
									key={user.id}
									className='flex gap-2 w-full bg-muted px-2 py-1 items-center rounded-sm'
								>
									<Avatar className='size-8'>
										<AvatarImage
											className='rounded-full size-8'
											src={user.avatar}
										/>
										<AvatarFallback>{(user.name as string).slice(0, 2)}</AvatarFallback>
									</Avatar>
									<div className='bold'>{user.name}</div>
								</div>
							))}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
