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

const OFFER_OPTIONS = {
	offerToReceiveAudio: true,
	offerToReceiveVideo: true,
};

const PC_CONFIG: RTCConfiguration = {
	iceServers: [
		{
			urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'],
		},
	],
};

type Props = {
	params: {
		id?: string;
	};
};

type Id = string;

type Peer = { connection: RTCPeerConnection | undefined; id: Id; name: string; isOffering: boolean; stream?: MediaStream };

let id = 0;

const getId = () => id++;

export default function Page({ params: { id } }: Props) {
	const { data: session } = useSession();

	if (!id) {
		return <span>Invalid id</span>;
	}

	if (!session) {
		return <div className='flex justify-center items-center h-full w-full'>Đang kết nối</div>;
	}

	return (
		<LocalVideo
			id={id}
			session={session}
		/>
	);
}

function LocalVideo({ id, session }: { id: string; session: any }) {
	const [video, setVideo] = useState<HTMLVideoElement | null>(null);
	const [stream, setStream] = useState<MediaStream | null>(null);

	useEffect(() => {
		if (video) {
			navigator.mediaDevices
				.getUserMedia(mediaConstraints)
				.then((stream) => {
					video.srcObject = stream;
					setStream(stream);
				})
				.catch((e) => {
					window.alert('getUserMedia Error! ' + e);
					alert('Error! Unable to access camera or mic! ');
				});
		}

		return () => {
			stream?.getTracks().forEach((track) => track.stop());
		};
	}, [video]);

	return (
		<div>
			<video
				className='flex h-[50dvh]'
				ref={setVideo}
				autoPlay
			/>
			{video && stream && (
				<VideoCall
					id={id}
					session={session}
					video={video}
					stream={stream}
				/>
			)}
		</div>
	);
}

function VideoCall({ id: roomId, session, video, stream }: { id: string; session: any; video: HTMLVideoElement; stream: MediaStream }) {
	const [isConnected, setIsConnected] = useState(socket.connected);
	const [isAudioMuted, setAudioMuted] = useState(false);
	const [isVideoMuted, setVideoMuted] = useState(false);
	const peersRef = useRef<Record<string, Peer>>({});

	const [render, setRender] = useState(0);
	const router = useRouter();

	useEffect(() => {
		setAudioState(stream, isAudioMuted);
		setVideoState(stream, isVideoMuted);

		if (socket.connected) {
			onConnect();
		} else {
			socket.connect();
		}

		function onConnect() {
			setIsConnected(true);
			socket.emit('join-room', { room_id: session.id });
			socket.emit('join-room', { room_id: roomId });
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

			const current = peersRef.current[id];
			if (current) {
				current.id = id;
				current.name = name;
			} else {
				peersRef.current[id] = { connection: undefined, name, id, isOffering: false };
			}

			start_webrtc();
		}

		function onUserDisconnect(data: any) {
			const id = data['id'];

			const peer = peersRef.current[id];
			const connection = peer?.connection;

			if (connection) {
				connection.onicecandidate = null;
				connection.ontrack = null;
				connection.onnegotiationneeded = null;
				connection.close();
			}

			peer.connection = undefined;

			delete peersRef.current[id];

			if (Object.keys(peersRef.current).length <= 1) {
				router.push('/');
			}

			setRender((prev) => prev + 1);
			start_webrtc();
		}
		function onUserList(data: any) {
			if ('list' in data) {
				// not the first to connect to room, existing user list recieved
				const list = data['list'];

				for (const id of Object.keys(list)) {
					const current = peersRef.current[id];
					if (current) {
						current.id = id;
						current.name = list[id];
					} else {
						peersRef.current[id] = { connection: undefined, name: list[id], id, isOffering: false };
					}
				}

				start_webrtc();
			}
		}

		function onDisconnect() {
			setIsConnected(false);
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
	}, []);

	useEffect(() => {
		return () => {
			socket.emit('leave-room', { room_id: roomId });

			stream?.getTracks()?.forEach((track) => track.stop());
			video.srcObject = null;

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

	function sendViaServer(data: Record<any, any>) {
		socket.emit('data', { ...data, id: getId() });
	}

	function start_webrtc() {
		for (const id of Object.keys(peersRef.current)) {
			invite(id);
		}

		setRender((prev) => prev + 1);
	}

	function invite(id: string) {
		const current = peersRef.current[id];

		if (!current) {
			peersRef.current[id] = { id, name: '', connection: undefined, isOffering: false };
		}

		if (current.connection) {
			return;
		}
		current.isOffering = true;

		const connection = createPeerConnection(id);

		if (id !== session.id) {
			stream.getTracks().forEach((track) => connection.addTrack(track, stream));
		}
	}

	function createPeerConnection(id: string) {
		const connection = new RTCPeerConnection(PC_CONFIG);

		const peer = peersRef.current[id];

		peer.connection = connection;

		connection.onicecandidate = (event: { candidate: unknown }) => {
			if (event.candidate) {
				sendViaServer({
					sender_id: session.id,
					target_id: id,
					type: 'new-ice-candidate',
					candidate: event.candidate,
				});
			}
		};

		connection.ontrack = (event) => {
			const videoElement = document.getElementById(id);

			if (!videoElement) {
				console.error('No video found');
			}

			console.log('Track received');

			if (event.streams) {
				peer.stream = event.streams[0];
			}
			setRender((prev) => prev + 1);
		};

		connection.onconnectionstatechange = (event) => {
			if (connection.connectionState === 'disconnected') {
				console.log(id + ' disconnect');
				peer.connection = undefined;
			}
		};

		connection.onnegotiationneeded = () => {
			connection
				.createOffer(OFFER_OPTIONS)
				.then((offer) => connection.setLocalDescription(offer))
				.then(() => {
					sendViaServer({
						sender_id: session.id,
						target_id: id,
						type: 'offer',
						sdp: connection.localDescription,
					});
				});
		};

		return connection;
	}

	useEffect(() => {
		Object.values(peersRef.current)
			.filter((peer) => peer.stream)
			.forEach((peer) => {
				const videoElement = document.getElementById(peer.id);
				if (videoElement) {
					(videoElement as HTMLVideoElement).srcObject = peer.stream || null;
				}
			});
	}, [render]);

	// function handleNegotiationNeededEvent(id: string) {
	// 	const connection = peersRef.current[id].connection;

	// 	if (!connection) {
	// 		throw 'WHYYY handleNegotiationNeededEvent';
	// 	}

	// 	// Room owner is the one to send offer
	// 	if (id !== roomId) {
	// 		return;
	// 	}

	// 	connection
	// 		.createOffer(OFFER_OPTIONS)
	// 		.then((offer) => connection.setLocalDescription(offer))
	// 		.then(() => {
	// 			sendViaServer({
	// 				sender_id: session.id,
	// 				target_id: id,
	// 				type: 'offer',
	// 				sdp: connection.localDescription,
	// 			});
	// 		})
	// 		.catch(console.error);
	// }

	async function handleOfferMsg(msg: { sender_id: string; name: string; sdp: RTCSessionDescriptionInit }) {
		const id = msg.sender_id;

		peersRef.current[id] = { id, name: '', connection: undefined, isOffering: false };
		const connection = createPeerConnection(id);

		const desc = new RTCSessionDescription(msg.sdp);

		connection
			.setRemoteDescription(desc)
			.then(() => {
				stream.getTracks().forEach((track) => connection.addTrack(track, stream));
				return connection.createAnswer();
			})
			.then((answer) => {
				return connection.setLocalDescription(answer);
			})
			.then(() => {
				sendViaServer({
					sender_id: session.id,
					target_id: id,
					type: 'answer',
					sdp: connection.localDescription,
				});
			});
	}

	function handleAnswerMsg(msg: { sender_id: string; sdp: RTCSessionDescriptionInit }) {
		const sender_id = msg['sender_id'];
		const desc = new RTCSessionDescription(msg['sdp']);
		const peer = peersRef.current[sender_id];
		let connection = peer.connection;

		if (!connection) {
			throw 'Illegal state';
		}

		connection.setRemoteDescription(desc);
	}

	function handleNewICECandidateMsg(msg: { sender_id: string; candidate: RTCIceCandidateInit }) {
		const candidate = new RTCIceCandidate(msg.candidate);
		const connection = peersRef.current[msg['sender_id']]?.connection;

		if (!connection) throw 'How ice';

		connection.addIceCandidate(candidate).catch(console.error);

		setRender((prev) => prev + 1);
	}

	return (
		<div className='h-full w-full flex flex-col overflow-y-auto'>
			<p>My id: {session.id}</p>
			<p>Room id: {roomId}</p>
			<p>Status: {isConnected ? 'connected' : 'disconnected'}</p>
			<Button onClick={() => router.push('/')}>Quay lại</Button>
			<div className='flex flex-col'>
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
										id={key}
										autoPlay
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
