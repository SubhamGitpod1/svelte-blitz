import createHandler from 'createHandler';
import { api } from 'app/blitz-server';
// @ts-ignore
import { rpcHandler } from '@blitzjs/rpc';

export const get = createHandler((req, res) => res.send('<h1>this works</h1>'));
export const post = createHandler(api(rpcHandler(console.info)));
