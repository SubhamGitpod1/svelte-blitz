import express, { type RequestHandler, type Response } from "express";
import type {RequestEvent, RequestHandlerOutput} from "@sveltejs/kit"
import cookie from "cookie"
import { createRequest, createResponse, type RequestMethod } from "node-mocks-http"
import type { NextApiHandler } from "@blitzjs/next";
const getBody = async (request: Request) => {
    try {
        return await request.json()
    } catch {
        return null
    }
}
export default function createHandler(handler: NextApiHandler) {
    return async (event: RequestEvent) => {
        event.params["blitz"]
        const app = express()
        const responsKeys: (
            "status"
            | "links"
            | "send"
            | "json"
            | "jsonp"
            | "sendStatus"
            | "sendFile"
            | "sendfile"
            | "download"
            | "contentType"
            | "type"
            | "format"
            | "attachment"
            | "append"
            | "set"
            | "header"
            | "get"
            | "clearCookie"
            | "cookie"
            | "location"
            | "redirect"
            | "vary"
            | "render"
        )[] = [
            "status",
            "links",
            "send",
            "json",
            "jsonp",
            "sendStatus",
            "sendFile",
            "sendfile",
            "download",
            "contentType",
            "type",
            "format",
            "attachment",
            "append",
            "set",
            "header",
            "get",
            "clearCookie",
            "cookie",
            "location",
            "redirect",
            "vary",
            "render"
        ]
        const headers: {[key: string]: string} = {}
        event.request.headers.forEach((value, key) => {
            headers[key] = value
        })
        const request = createRequest({
            app,
            url: event.request.url,
            headers,
            cookie: cookie.parse(event.request.headers.get("Cookie") ?? ""),
            query: Object.keys(event.params).reduce((params, key) => ({
                ...params,
                [key]: event.params[key].split("/")
            }), {}),
            method: event.request.method as RequestMethod,
            body: await getBody(event.request)
        })
        const response = createResponse({
            req: request
        })
        const result = new Promise<RequestHandlerOutput>(resolve => app.use((req, res, next) => {
            responsKeys.forEach(key => {
                (res as any)[key] = express.response[key].bind(res)
            })
            res.end = (function (this: Response, chunk: any, encoding: any, callback: any) {
                resolve({
                    status: res.statusCode,
                    body: chunk,
                    headers: res.getHeaders()
                })
                return this
            }).bind(res) as typeof res.end
            next()
        }))
        app.use(handler as any)
        app(request, response)
        return result
    }
}