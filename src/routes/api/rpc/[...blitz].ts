import createHandler from "createHandler"
import { api } from "app/blitz-server"
import { rpcHandler } from "@blitzjs/rpc"

export const get = createHandler((req, res) => res.send("<h1>this works</h1>"))
export const post = createHandler(api(rpcHandler({onError: console.log})))