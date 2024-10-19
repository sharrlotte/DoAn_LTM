'use client';

import { useSession } from '@/app/query-context';
import { Button } from '@/components/ui/button';
import { socket } from '@/config/socket';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

const mediaConstraints: MediaStreamConstraints = {
	audio: true,
	video: {
		height: 360,
		noiseSuppression: true,
	},
};

type Props = {
	params: {
		id?: string;
	};
};

type Id = string;

type Peer = { connection: RTCPeerConnection | undefined; id: Id; name: string };

export default function Page({ params: { id } }: Props) {
	const { data: session } = useSession();

	if (!id) {
		return <span>Invalid id</span>;
	}

	if (!session) {
		return <div className='flex justify-center items-center h-full w-full'>Đang kết nối</div>;
	}

	return (
		<VideoCall
			id={id}
			session={session}
		/>
	);
}

function VideoCall({ id: roomId, session }: { id: string; session: any }) {
	const [isConnected, setIsConnected] = useState(socket.connected);
	const [isAudioMuted, setAudioMuted] = useState(false);
	const [isVideoMuted, setVideoMuted] = useState(false);
	const peersRef = useRef<Record<string, Peer>>({});
	const videoRef = useRef<HTMLVideoElement>(null);

	const [_, setRender] = useState(0);
	const router = useRouter();

	useEffect(() => {
		const element = videoRef.current;
		if (element) {
			navigator.mediaDevices
				.getUserMedia(mediaConstraints)
				.then((stream) => {
					element.srcObject = stream;

					function connect() {
						if (!socket.connected) {
							socket.connect();
							socket.on('connect', () => {
								socket.off('connect', connect);
								start();
							});
						} else {
							start();
						}
					}
					connect();
				})
				.catch((e) => {
					window.alert('getUserMedia Error! ' + e);
					alert('Error! Unable to access camera or mic! ');
				});
		}

		return () => {
			(element?.srcObject as MediaStream)?.getTracks().forEach((track) => track.stop());
		};
	}, []);

	useEffect(() => {
		const stream = videoRef.current?.srcObject as MediaStream;
		if (stream) {
			setAudioState(stream, isAudioMuted);
			setVideoState(stream, isVideoMuted);
		}
	}, []);

	useEffect(() => {
		return () => {
			socket.emit('leave-room', { room_id: roomId });

			const video = videoRef.current;
			if (video) {
				const stream = video.srcObject as MediaStream;

				if (stream) {
					var tracks = stream.getTracks();
					tracks?.forEach((track) => track.stop());
				}

				video.srcObject = null;
			}

			Object.values(peersRef.current).forEach((peer) => {
				if (peer.connection) {
					peer.connection.close();
				}
			});
		};
	}, []);

	function setVideoState(stream: MediaStream, isMuted: boolean) {
		stream.getVideoTracks().forEach((track) => {
			track.enabled = !isMuted;
			if (isMuted) {
				track.stop();
			}
		});
	}

	function setAudioState(stream: MediaStream, isMuted: boolean) {
		stream.getAudioTracks().forEach((track) => {
			track.enabled = !isMuted;
			if (isMuted) {
				track.stop();
			}
		});
	}

	function start() {
		function onConnect() {
			socket.emit('join-room', { room_id: roomId });
			setIsConnected(true);

			Object.values(peersRef.current).forEach((peer) => {
				const connection = peer?.connection;

				if (connection) {
					connection.onicecandidate = null;
					connection.ontrack = null;
					connection.onnegotiationneeded = null;
				}
			});

			peersRef.current = {};
		}

		function onNotFriend() {
			alert('Không phải là bạn');
		}

		function handleData(msg: any) {
			switch (msg['type']) {
				case 'offer':
					handleOfferMsg(msg);
					break;

				case 'answer':
					handleAnswerMsg(msg);
					break;

				case 'new-ice-candidate':
					handleNewICECandidateMsg(msg);
					break;
			}
		}

		function onUserConnect(data: any) {
			const id = data['id'];
			const name = data['name'];

			if (id === session.id) {
				return;
			}

			peersRef.current[id] = { connection: undefined, name, id };

			start_webrtc();

			setRender((prev) => prev + 1);
		}

		function onUserDisconnect(data: any) {
			const id = data['id'];

			const peer = peersRef.current[id];
			const connection = peer?.connection;

			if (connection) {
				connection.onicecandidate = null;
				connection.ontrack = null;
				connection.onnegotiationneeded = null;
			}

			delete peersRef.current[id];

			if (Object.keys(peersRef.current).length <= 1) {
				router.push('/');
			}
		}
		function onUserList(data: any) {
			if ('list' in data) {
				// not the first to connect to room, existing user list recieved
				const list = data['list'];

				for (const id of Object.keys(list)) {
					peersRef.current[id] = { connection: undefined, name: list[id], id: id };
					setRender((prev) => prev + 1);
				}

				start_webrtc();
			}
		}

		if (socket.connected) {
			onConnect();
		}

		function onDisconnect() {
			setIsConnected(false);
			socket.emit('leave-room', { room_id: roomId });

			const video = videoRef.current;
			if (video) {
				const stream = video.srcObject as MediaStream;

				if (stream) {
					var tracks = stream.getTracks();
					tracks?.forEach((track) => track.stop());
				}

				video.srcObject = null;
			}

			Object.values(peersRef.current).forEach((peer) => {
				if (peer.connection) {
					peer.connection.close();
				}
			});

			router.push('/');
		}

		socket.on('data', handleData);
		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);
		socket.on('not-friend', onNotFriend);
		socket.on('user-connect', onUserConnect);
		socket.on('user-disconnect', onUserDisconnect);
		socket.on('user-list', onUserList);

		return () => {
			socket.off('data', handleData);
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
			socket.off('not-friend', onNotFriend);
			socket.off('user-connect', onUserConnect);
			socket.off('user-disconnect', onUserDisconnect);
			socket.off('user-list', onUserList);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}

	const PC_CONFIG = {
		configuration: {
			offerToReceiveAudio: true,
			offerToReceiveVideo: true,
		},
		iceServers: [
			{
				urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'],
			},
		],
	};

	function sendViaServer(data: unknown) {
		socket.emit('data', data);
	}

	function start_webrtc() {
		for (const id of Object.keys(peersRef.current)) {
			invite(id);
		}
	}

	function invite(id: string) {
		if (id === session.id) {
			return;
		}

		if (peersRef.current[id].connection != null) {
			return;
		}

		const conn = createPeerConnection(id);

		const stream = videoRef.current?.srcObject as MediaStream;

		stream?.getTracks().forEach((track) => {
			conn.addTrack(track, stream);
		});
	}

	function createPeerConnection(id: string) {
		const connection = new RTCPeerConnection(PC_CONFIG);

		const peer = peersRef.current[id];
		peer.connection = connection;

		connection.onnegotiationneeded = () => {
			handleNegotiationNeededEvent(id);
		};

		connection.onicecandidate = (event) => {
			handleICECandidateEvent(event, id);
		};

		connection.ontrack = (event) => {
			handleTrackEvent(event, id);
		};
		return connection;
	}

	function handleNegotiationNeededEvent(id: string) {
		const connection = peersRef.current[id].connection;

		if (!connection) {
			throw 'WHYYY handleNegotiationNeededEvent';
		}

		connection
			.createOffer()
			.then((offer) => connection.setLocalDescription(offer))
			.then(() => {
				sendViaServer({
					sender_id: session.id,
					target_id: id,
					type: 'offer',
					sdp: connection.localDescription,
				});
			})
			.catch(console.error);
	}

	async function handleOfferMsg(msg: { sender_id: string; name: string; sdp: RTCSessionDescriptionInit }) {
		const id = msg.sender_id;

		peersRef.current[id] = { id, name: '', connection: undefined };
		const connection = createPeerConnection(id);

		const desc = new RTCSessionDescription(msg.sdp);

		console.log('handle offer');

		await connection.setRemoteDescription(desc);
		console.log('set remote');
		const stream = videoRef.current?.srcObject as MediaStream;

		stream?.getTracks().forEach((track) => {
			connection.addTrack(track, stream);
		});

		console.log('add track');
		const answer = await connection.createAnswer();
		console.log('create answer');
		await connection.setLocalDescription(answer);
		console.log('set local');

		sendViaServer({
			sender_id: session.id,
			target_id: id,
			type: 'answer',
			sdp: connection.localDescription,
		});
		console.log('send');
	}

	function handleAnswerMsg(msg: { sender_id: string; sdp: RTCSessionDescriptionInit }) {
		const sender_id = msg['sender_id'];
		const desc = new RTCSessionDescription(msg['sdp']);
		const peer = peersRef.current[sender_id];
		const connection = peer.connection;

		if (!connection) throw 'How ans';

		connection.setRemoteDescription(desc);
	}

	function handleICECandidateEvent(event: { candidate: unknown }, id: string) {
		if (event.candidate) {
			sendViaServer({
				sender_id: session.id,
				target_id: id,
				type: 'new-ice-candidate',
				candidate: event.candidate,
			});
		}
	}

	function handleNewICECandidateMsg(msg: { sender_id: string; candidate: RTCIceCandidateInit }) {
		const candidate = new RTCIceCandidate(msg.candidate);
		const connection = peersRef.current[msg['sender_id']].connection;

		if (!connection) throw 'How ice';

		connection.addIceCandidate(candidate).catch(console.error);
	}

	function handleTrackEvent(event: RTCTrackEvent, id: string) {
		const videoElement = document.getElementById(id);

		if (!videoElement) {
			setRender((prev) => prev + 1);
		}

		if (event.streams && videoElement) {
			(videoElement as HTMLVideoElement).srcObject = event.streams[0];
		}
	}

	return (
		<div className='h-full w-full flex flex-col overflow-y-auto'>
			<p>My id: {session.id}</p>
			<p>Room id: {roomId}</p>
			<p>Status: {isConnected ? 'connected' : 'disconnected'}</p>
			<Button onClick={() => router.push('/')}>Quay lại</Button>
			<div className='flex flex-col'>
				<video
					className='flex h-[50dvh]'
					ref={videoRef}
					autoPlay
				/>
				<div className='flex flex-wrap gap-2'>
					{Object.entries(peersRef.current)
						.filter(([key]) => key !== session.id)
						.map(([key, value]) => (
							<div key={key}>
								<div>{key}</div>
								<div>{value.name}</div>
								<div className='relative'>
									<video
										className='border rounded-sm'
										autoPlay
										id={key}
									/>
									<div className='absolute top-1/2 bottom-1/2 left-1/2 right-1/2'>{value.connection ? '' : 'Not connected'}</div>
								</div>
							</div>
						))}
				</div>
				<div className='grid grid-cols-3 gap-2'>
					<button onClick={() => setAudioMuted((prev) => !prev)}>Audio ({isAudioMuted ? 'Off' : 'On'})</button>
					<button onClick={() => setVideoMuted((prev) => !prev)}>Video ({isVideoMuted ? 'Off' : 'On'})</button>
					<button>End call</button>
				</div>
			</div>
		</div>
	);
}
