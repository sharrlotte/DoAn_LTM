'use client';

import { envConfig } from '@/config/environment';
import { io } from 'socket.io-client';

export const socket = io(envConfig.websocketUrl, {
	transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling'],
	autoConnect: false,
});
