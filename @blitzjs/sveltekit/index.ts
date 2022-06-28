import {loadWithBlitz} from "./rpc"
import type { ClientPlugin } from "blitz"

export function setupBlitzClient<TPlugins extends readonly ClientPlugin<object>[]>({plugins}: {
    plugins: TPlugins
}) {
    return {loadWithBlitz}
}