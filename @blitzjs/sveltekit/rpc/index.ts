import { type Ctx, isClient, AuthenticationError, CSRFTokenMismatchError, AuthorizationError, NotFoundError, RedirectError } from "blitz";
import {invoke as blitzInvoke} from "@blitzjs/rpc/dist/index-browser.mjs"
import EventEmitter from "events"
import type { Load } from "@sveltejs/kit";
import {server} from "$app/env"
declare global {
    var contextEmitter: EventEmitter | null
}

const blitzErrors = {
    AuthenticationError,
    CSRFTokenMismatchError,
    AuthorizationError,
    NotFoundError, 
    RedirectError
}

if(!isClient) globalThis.contextEmitter = new EventEmitter();
async function *contextGenerator(): AsyncGenerator<Ctx | null, Ctx | null, Ctx | null> {
    let context: Ctx | null = null
    while(true) {
        const newContext: Ctx | null = yield context
        if(newContext == null) continue
        if(context == null) globalThis.contextEmitter?.emit("blitz-context:first-set", newContext)
        context = newContext
    }
}
const Context = contextGenerator()
export async function getContext() {
    if(isClient) return
    const context = (await Context.next()).value
    if(context != null) return context
    return await new Promise<Ctx>(resolve => globalThis.contextEmitter?.once("blitz-context:first-set", (context: Ctx) => {
        resolve(context)
    }))
}
export async function setContext(context: Ctx) {
    if(isClient) return
    await Context.next(context)
    return (await Context.next(context)).value
}

export async function invoke<T extends (...args: any[]) => any>(fn: T, argument: Parameters<T>[0]) {
    if(isClient) try {return await blitzInvoke(fn, argument)}
    catch(error: any) {
        if(error.name in blitzErrors) {
            if(error.url == null) throw new (blitzErrors as any)[error.name]()
            throw new (blitzErrors as any)[error.name](error.url)
        }
        throw error
    }
    const context = await getContext()

    return await fn(argument, context)
}


export const loadWithBlitz = (load: Load): Load => {
    return async (...args: Parameters<Load>) => {
        if(server) {
            const {createRequest, createResponse} = await import("node-mocks-http")
            const {default: cookie} = await import("cookie")
            const {getSession} = await import("@blitzjs/auth")
            const req = createRequest({
                url: args[0].url.toString(),
                headers: (args[0].session as any).headers,
                cookies: cookie.parse((args[0].session as any).headers.cookie),
                method: "GET"
            })
            const res = createResponse({req})
            await getSession(req as any, res as any)
            await setContext((res as any).blitzCtx)
            const loadReturn = await load(...args)
            return await load(...args)
        }
        return await load(...args)
    }
}