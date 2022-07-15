import typedSymbol from "typedSymbol";
import type {Writable} from "svelte/store"
export type FormDataType = {
    [key: string]: string | number | FormDataType | null | string[] | number[] | FormDataType[]
}
export default typedSymbol<Writable<FormDataType>>("values of all inputs")