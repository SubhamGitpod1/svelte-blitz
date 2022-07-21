import { type Ctx, isClient, AuthenticationError, CSRFTokenMismatchError, AuthorizationError, NotFoundError, RedirectError } from "blitz";
import {invoke as blitzInvoke} from "../../rpc/dist/index-browser.mjs"
import EventEmitter from "events"
import type { Load } from "@sveltejs/kit";
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
    return (await Context.next(context)).value
}

export async function invoke<T extends (...args: any[]) => any>(fn: T, argument: Parameters<T>[0]) {
    if(isClient) try {return await blitzInvoke(fn, argument)}
    catch(error: any) {
        console.log(error)
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
        await setContext(eval((args[0].session as any)?.BlitzContext) as Ctx)
        const loadReturn = await load(...args)
        return await load(...args)
    }
}