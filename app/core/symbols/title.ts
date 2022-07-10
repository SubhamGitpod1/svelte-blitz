import typedSymbol from "typedSymbol";
import type {Writable} from "svelte/store"
export default typedSymbol<Writable<string>>("title")