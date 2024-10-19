'use client';

import { getAccessToken } from '@/app/auth/page';
import { envConfig } from '@/config/environment';
import { io } from 'socket.io-client';

export const socket = io(envConfig.websocketUrl, {
	transports: ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling'],
	autoConnect: false,
	auth: (cb) => {
		return cb({ Authorization: getAccessToken() });
	},
});
