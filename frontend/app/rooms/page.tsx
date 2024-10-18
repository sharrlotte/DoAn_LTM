import { createRoom } from '@/action';
import React from 'react';

export default function Page() {
	async function handleSubmit(data: FormData) {
		const result = await createRoom(data);

		if (result && 'error' in result) {
			window.alert(result.error);
		}
	}

	return (
		<div>
			<form
				id='room_form'
				onSubmit={(event) => {
					handleSubmit(new FormData(event.currentTarget));
					event.preventDefault();
					event.stopPropagation();
				}}
			>
				<div className='flex flex-col gap-1'>
					<input
						className='border rounded-sm p-2'
						type='text'
						name='room_id'
						placeholder='Custom Room Name'
						required
						hidden
						defaultValue={Math.ceil(Math.random() * 10000)}
					/>
					<input
						className='border rounded-sm p-2'
						type='text'
						name='name'
						placeholder='Custom Room Name'
						required
					/>
					<div>Please fill out this field.</div>
					<div>
						<button
							className='px-2 py-1 min-w-20 border rounded-md'
							type='submit'
						>
							Join
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}
