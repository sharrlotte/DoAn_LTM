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

function VideoCall({ id }: { id: string }) {
	const [isConnected, setIsConnected] = useState(false);
	const [isAudioMuted, setAudioMuted] = useState(false);
	const [isVideoMuted, setVideoMuted] = useState(false);
	const [myId, setMyId] = useState('');
	const [peers, setPeers] = useState<Record<string, Peer>>({});

	const videoRef = useRef<HTMLVideoElement>(null);
	const videoElement = videoRef.current;

	useEffect(() => {
		socket.connect();
	}, []);

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
		if (videoElement) {
			navigator.mediaDevices
				.getUserMedia(mediaConstraints)
				.then((stream) => {
					videoElement.srcObject = stream;

					setAudioState(stream, isAudioMuted);
					setVideoState(stream, isVideoMuted);

					videoElement.play();
				})
				.catch((e) => {
					window.alert('getUserMedia Error! ' + e);
					alert('Error! Unable to access camera or mic! ');
				});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [videoElement]);

	useEffect(() => {
		startCamera();
	}, [startCamera]);

	useEffect(() => {
		return () => {
			if (videoElement) {
				(videoElement.srcObject as MediaStream)?.getTracks().forEach((track) => {
					track.stop();
				});
			}
		};
	}, [videoElement]);

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
			socket.emit('join-room', { room_id: id });
		});

		socket.on('user-connect', (data) => {
			const id = data['sid'];
			const name = data['name'];

			setPeers((prev) => ({ ...prev, id: { connection: undefined, name, id } }));
		});

		socket.on('user-disconnect', (data) => {
			const id = data['sid'];
			closeConnection(id);
			setPeers((prev) => Object.fromEntries(Object.entries(prev).filter(([peerId]) => peerId !== id)));
		});

		socket.on('user-list', (data) => {
			setMyId(data['my_id']);

			if ('list' in data) {
				// not the first to connect to room, existing user list recieved
				const list = data['list'];

				// add existing users to user list
				for (const id in list) {
					const name = list[id];
					delete peers[id];

					setPeers((prev) => ({ ...prev, id: { connection: undefined, name, id } }));
				}
				start_webrtc();
			}
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function closeConnection(id: string) {
		const connection = peers[id]?.connection;

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

	function start_webrtc() {
		// send offer to all other members
		for (const id in peers) {
			invite(id);
		}
	}

	function invite(id: string) {
		if (peers[id]) {
			window.alert('[Not supposed to happen!] Attempting to start a connection that already exists!');
		} else if (id === myId) {
			window.alert('[Not supposed to happen!] Trying to connect to self!');
		} else {
			window.alert(`Creating peer connection for <${id}> ...`);
			createPeerConnection(id);

			const videoElement = videoRef.current;
			if (videoElement) {
				const stream = videoElement.srcObject as MediaStream;

				stream?.getTracks().forEach((track) => {
					peers[id]?.connection?.addTrack(track, stream);
				});
			}
		}
	}

	function createPeerConnection(id: string) {
		const connection = new RTCPeerConnection(PC_CONFIG);

		setPeers((prev) => ({ ...prev, id: { connection, name: '', id } }));

		connection.onicecandidate = (event) => {
			handleICECandidateEvent(event, id);
		};
		connection.ontrack = (event) => {
			handconstrackEvent(event);
		};
		connection.onnegotiationneeded = () => {
			handleNegotiationNeededEvent(id);
		};
	}

	function handleNegotiationNeededEvent(id: string) {
		peers[id]?.connection
			?.createOffer()
			.then((offer) => {
				return peers[id].connection?.setLocalDescription(offer);
			})
			.then(() => {
				sendViaServer({
					sender_id: myId,
					target_id: id,
					type: 'offer',
					sdp: peers[id]?.connection?.localDescription,
				});
			})
			.catch(window.alert);
	}

	function handleOfferMsg(msg: { sender_id: string; sdp: RTCSessionDescriptionInit }) {
		const id = msg['sender_id'];

		createPeerConnection(id);
		const desc = new RTCSessionDescription(msg['sdp']);
		peers[id]?.connection
			?.setRemoteDescription(desc)
			.then(() => {
				const stream = videoRef.current?.srcObject as MediaStream;

				stream?.getTracks().forEach((track) => {
					peers[id]?.connection?.addTrack(track, stream);
				});
			})
			.then(() => {
				return peers[id]?.connection?.createAnswer();
			})
			.then((answer) => {
				return peers[id]?.connection?.setLocalDescription(answer);
			})
			.then(() => {
				sendViaServer({
					sender_id: myId,
					target_id: id,
					type: 'answer',
					sdp: peers[id]?.connection?.localDescription,
				});
			})
			.catch(window.alert);
	}

	function handleAnswerMsg(msg: { sender_id: string; sdp: RTCSessionDescriptionInit }) {
		const id = msg['sender_id'];
		const desc = new RTCSessionDescription(msg['sdp']);
		peers[id]?.connection?.setRemoteDescription(desc);
	}

	function handleICECandidateEvent(event: { candidate: unknown }, id: string) {
		if (event.candidate) {
			sendViaServer({
				sender_id: myId,
				target_id: id,
				type: 'new-ice-candidate',
				candidate: event.candidate,
			});
		}
	}

	function handleNewICECandidateMsg(msg: { sender_id: string; candidate: RTCIceCandidateInit }) {
		const candidate = new RTCIceCandidate(msg.candidate);
		peers[msg['sender_id']]?.connection?.addIceCandidate(candidate).catch(window.alert);
	}

	function handconstrackEvent(event: RTCTrackEvent) {
		const videoElement = videoRef.current;
		if (event.streams && videoElement) {
			videoElement.srcObject = event.streams[0];
		}
	}

	return (
		<div>
			<p>Status: {isConnected ? 'connected' : 'disconnected'}</p>
			<div className='flex flex-col'>
				<video ref={videoRef}></video>
				<h2>Peer list</h2>
				<div className='flex flex-wrap gap-2'></div>

				<div className='grid grid-cols-3 gap-2'>
					<button onClick={() => setAudioMuted((prev) => !prev)}>Audio ({isAudioMuted ? 'Off' : 'On'})</button>
					<button onClick={() => setVideoMuted((prev) => !prev)}>Video ({isVideoMuted ? 'Off' : 'On'})</button>
					<button>End call</button>
				</div>
			</div>
		</div>
	);
}
