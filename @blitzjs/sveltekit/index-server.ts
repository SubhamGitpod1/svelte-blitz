import { setupBlitzServer as setupBlitzServerNext } from "@blitzjs/next";
import { baseLogger } from "blitz";
(global as any).baseLogger = baseLogger
import {getSession as getBlitzSession} from "@blitzjs/auth"
import type { GetSession, Load } from "@sveltejs/kit";

export const getSessionWithBlitz = (getSession: GetSession): GetSession => {
    return async (event) => {
        const session = await getSession(event)
        if(event.request.method !== "GET") return session
        return {...session,headers: Object.fromEntries(event.request.headers as any)}
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