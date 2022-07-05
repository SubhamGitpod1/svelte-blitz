import { setupBlitzServer } from '@blitzjs/sveltekit/index-server';
import { AuthServerPlugin, PrismaStorage } from '@blitzjs/auth';
import db from 'db';
import { simpleRolesIsAuthorized } from '@blitzjs/auth';
// import { authConfig } from './blitz-client';
export const { gSSP, gSP, api, getSessionWithBlitz } = setupBlitzServer({
	plugins: [
		AuthServerPlugin({
			cookiePrefix: "blitz-cookie-prefix",
			storage: PrismaStorage(db as any),
			isAuthorized: simpleRolesIsAuthorized
		})
	]
});
