import { setupBlitzServer as setupBlitzServerNext } from "@blitzjs/next";
import { baseLogger } from "blitz";
global.baseLogger = baseLogger
import {getSession as getBlitzSession} from "@blitzjs/auth"
import type { GetSession, Load } from "@sveltejs/kit";
import {stringify} from "javascript-stringify"
import { getRequestResponse } from "../../createHandler";

export const getSessionWithBlitz = (getSession: GetSession): GetSession => {
    return async (event) => {
        const session = await getSession(event)
        if(event.request.method !== "GET") return session
        const [req, res] = await getRequestResponse(event)
        await getBlitzSession(req as any, res as any)
        const BlitzContext = stringify((res as any).blitzCtx, null, null, {references: true})
        return {...session, BlitzContext}
    }
}

export const setupBlitzServer = (...args: Parameters<typeof setupBlitzServerNext>) => {
    const returned = setupBlitzServerNext(...args)
    const api: typeof returned.api = (handler) => {
        return async (req, res) => {
            await getBlitzSession(req, res)
            return await returned.api(handler)(req, res)
        }
    }
    return {...returned, getSessionWithBlitz}
}