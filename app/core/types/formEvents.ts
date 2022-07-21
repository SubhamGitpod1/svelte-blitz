import type {FormDataType} from "app/core/symbols/formData"
import type FormErrors from "./FormErrors"
import type {z, ZodObject} from "zod"
export type SubmitHandler<T extends ZodObject<any, any>> = (e: CustomEvent<{
    formData: FormDataType,
    setError: (formErrors: FormErrors<z.infer<T>>) => void
}> & {currentTarget: EventTarget | null}) => any