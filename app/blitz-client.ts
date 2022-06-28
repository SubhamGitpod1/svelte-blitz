import { AuthClientPlugin } from '@blitzjs/auth/dist/index-browser.mjs';
import { setupBlitzClient } from '@blitzjs/sveltekit';
import { BlitzRpcPlugin } from '@blitzjs/rpc/dist/index-browser.mjs';

export const authConfig = {
	cookiePrefix: 'blitz-cookie-prefix'
};

export const { loadWithBlitz } = setupBlitzClient({
	plugins: [AuthClientPlugin(authConfig), BlitzRpcPlugin({})]
});
