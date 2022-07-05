import type { InjectionKey } from "node_modules/svelte-typed-context/index";

export default function typedSymbol<T>(description?: string | number): InjectionKey<T> {
    return Symbol(description)
}