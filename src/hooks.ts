import type { GetSession, Handle } from '@sveltejs/kit';
import * as cookie from 'cookie';
import { getSessionWithBlitz } from 'app/blitz-server';

export const handle: Handle = async ({ event, resolve }) => {
	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	event.locals.userid = cookies['userid'] || crypto.randomUUID();
	const response = await resolve(event);
	("response", response.headers)
	if (!cookies['userid']) {
		// if this is the first time the user has visited this app,
		// set a cookie so that we recognise them when they return
		response.headers.set(
			'set-cookie',
			cookie.serialize('userid', event.locals.userid, {
				path: '/',
				httpOnly: true
			})
		);
	}
	return response;
};



export const getSession: GetSession = getSessionWithBlitz(() => ({}))