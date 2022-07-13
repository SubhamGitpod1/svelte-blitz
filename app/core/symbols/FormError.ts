import type { Writable } from "svelte/store";
import type { ZodFormattedError, ZodObject } from "zod";
import typedSymbol from "typedSymbol";

export default typedSymbol<Writable<ZodFormattedError<{
    [key: string]: any
}>>>("form error")