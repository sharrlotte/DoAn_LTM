'use client';

import { socket } from '@/config/socket';
import React, { useCallback, useEffect, useRef, useState } from 'react';

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

type Peer = { connection: RTCPeerConnection | undefined; id: string; name: string };

export default function Page({ params: { id } }: Props) {
	if (!id) {
		return <span>Invalid id</span>;
	}

	return <VideoCall id={id} />;
}

function VideoCall({ id: roomId }: { id: string }) {
	const [isConnected, setIsConnected] = useState(false);
	const [isAudioMuted, setAudioMuted] = useState(false);
	const [isVideoMuted, setVideoMuted] = useState(false);
	const peerRef = useRef<Record<string, Peer>>({});

	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (socket.connected) {
			onConnect();
		}

		function onConnect() {
			setIsConnected(true);
		}

		function onDisconnect() {
			setIsConnected(false);
		}

		socket.on('connect', onConnect);
		socket.on('disconnect', onDisconnect);

		socket.on('data', (msg) => {
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
		});

		return () => {
			socket.off('connect', onConnect);
			socket.off('disconnect', onDisconnect);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const startCamera = useCallback(() => {
		const element = videoRef.current;
		if (element) {
			navigator.mediaDevices
				.getUserMedia(mediaConstraints)
				.then((stream) => {
					element.srcObject = stream;

					setAudioState(stream, isAudioMuted);
					setVideoState(stream, isVideoMuted);

					socket.connect();
				})
				.catch((e) => {
					window.alert('getUserMedia Error! ' + e);
					alert('Error! Unable to access camera or mic! ');
				});
		}

		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		startCamera();
	}, [startCamera]);

	useEffect(() => {
		const element = videoRef.current;

		return () => {
			if (element) {
				(element.srcObject as MediaStream)?.getTracks().forEach((track) => {
					track.stop();
				});
			}
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

	useEffect(() => {
		socket.on('connect', () => {
			socket.emit('join-room', { room_id: roomId });
		});

		socket.on('user-connect', (data) => {
			const id = data['sid'];

			peerRef.current[id] = { connection: undefined, name: '', id };
		});

		socket.on('user-disconnect', (data) => {
			const id = data['sid'];
			closeConnection(id);
			peerRef.current = Object.fromEntries(Object.entries(peerRef.current).filter(([peerId]) => peerId !== id));
		});

		socket.on('user-list', (data) => {
			if ('list' in data) {
				// not the first to connect to room, existing user list recieved
				const list = data['list'];

				// add existing users to user list
				for (const id of Object.keys(list)) {
					delete peerRef.current[id];

					peerRef.current[id] = { connection: undefined, name: '', id };

					start_webrtc(peerRef.current);
				}
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [roomId]);

	function closeConnection(id: string) {
		const connection = peerRef.current[id]?.connection;

		if (connection) {
			connection.onicecandidate = null;
			connection.ontrack = null;
			connection.onnegotiationneeded = null;
		}
	}

	const PC_CONFIG = {
		iceServers: [
			{
				urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302', 'stun:stun3.l.google.com:19302', 'stun:stun4.l.google.com:19302'],
			},
		],
	};

	function sendViaServer(data: unknown) {
		socket.emit('data', data);
	}

	function start_webrtc(peers: Record<string, Peer>) {
		for (const id of Object.keys(peers)) {
			invite(id);
		}
	}

	function invite(id: string) {
		if (id === socket.id) {
			return;
		}

		if (peerRef.current[id]?.connection) {
			return;
		}

		createPeerConnection(id);

		const stream = videoRef.current?.srcObject as MediaStream;

		stream.getTracks().forEach((track) => {
			peerRef.current[id].connection?.addTrack(track, stream);
		});
	}

	function createPeerConnection(id: string) {
		const connection = new RTCPeerConnection(PC_CONFIG);

		peerRef.current[id] = { connection, id: id, name: id };

		connection.onicecandidate = (event) => {
			console.log({ ice: event });
			handleICECandidateEvent(event, id);
		};
		connection.ontrack = (event) => {
			console.log({ track: event });
			handleTrackEvent(event, id);
		};
		connection.onnegotiationneeded = () => {
			console.log({ neg: id });
			handleNegotiationNeededEvent(id);
		};
	}

	function handleNegotiationNeededEvent(id: string) {
		const connection = peerRef.current[id].connection;
		if (!connection) {
			throw 'WTF';
		}

		connection
			.createOffer()
			.then((offer) => {
				if (!connection) {
					throw 'WTF';
				}
				return connection.setLocalDescription(offer);
			})
			.then(() => {
				if (!connection) {
					throw 'WTF';
				}
				sendViaServer({
					sender_id: socket.id,
					target_id: id,
					type: 'offer',
					sdp: connection.localDescription,
				});
			});
	}

	function handleOfferMsg(msg: { sender_id: string; sdp: RTCSessionDescriptionInit }) {
		const id = msg.sender_id;

		createPeerConnection(id);

		const desc = new RTCSessionDescription(msg.sdp);
		const connection = peerRef.current[id].connection;

		if (!connection) {
			throw 'WTF';
		}

		connection
			.setRemoteDescription(desc)
			.then(() => {
				const stream = videoRef.current?.srcObject as MediaStream;

				stream.getTracks().forEach((track) => {
					if (!connection) {
						throw 'WTF';
					}

					connection.addTrack(track, stream);
				});
			})
			.then(() => {
				if (!connection) {
					throw 'WTF';
				}

				return connection.createAnswer();
			})
			.then((answer) => {
				if (!connection) {
					throw 'WTF';
				}

				return connection.setLocalDescription(answer);
			})
			.then(() => {
				if (!connection) {
					throw 'WTF';
				}

				sendViaServer({
					sender_id: socket.id,
					target_id: id,
					type: 'answer',
					sdp: connection.localDescription,
				});
			});
	}

	function handleAnswerMsg(msg: { sender_id: string; sdp: RTCSessionDescriptionInit }) {
		const id = msg['sender_id'];
		const desc = new RTCSessionDescription(msg['sdp']);
		const connection = peerRef.current[id].connection;

		if (!connection) {
			throw 'WTF';
		}

		connection.setRemoteDescription(desc);
	}

	function handleICECandidateEvent(event: { candidate: unknown }, id: string) {
		if (event.candidate) {
			sendViaServer({
				sender_id: socket.id,
				target_id: id,
				type: 'new-ice-candidate',
				candidate: event.candidate,
			});
		}
	}

	function handleNewICECandidateMsg(msg: { sender_id: string; candidate: RTCIceCandidateInit }) {
		const candidate = new RTCIceCandidate(msg.candidate);
		const connection = peerRef.current[msg['sender_id']].connection;

		if (!connection) {
			throw 'WTF';
		}

		connection.addIceCandidate(candidate);
	}

	function handleTrackEvent(event: RTCTrackEvent, id: string) {
		const videoElement = document.getElementById(id);

		if (event.streams && videoElement) {
			(videoElement as HTMLVideoElement).srcObject = event.streams[0];
		}
	}

	return (
		<div className='h-full w-full'>
			<p>Status: {isConnected ? 'connected' : 'disconnected'}</p>
			<div className='flex flex-col'>
				<video
					className='flex h-[50dvh]'
					ref={videoRef}
					autoPlay
				/>
				<h2>Peer list</h2>
				<div className='flex flex-wrap gap-2'>
					{Object.entries(peerRef.current).map(([key]) => (
						<video
							className='border rounded-sm'
							autoPlay
							id={key}
							key={key}
						/>
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
