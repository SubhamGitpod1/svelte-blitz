<script lang="ts">
    import type {ZodObject, z, ZodFormattedError} from "zod"
    import {setContext} from "svelte-typed-context"
    import {createEventDispatcher} from "svelte"
    import {writable} from "svelte/store"

    import FormData, {type FormDataType} from "app/core/symbols/formData"
    import FormError from "app/core/symbols/FormError"
    import Schema from "app/core/symbols/Schema"
    import type FormErrors from "app/core/types/FormErrors"

    import Error from "app/core/components/Error.svelte"
    export let errorContainerClass = "error"
    export let errorElementClass = ""
    export let errorListContainerClass = ""
    export let errorContainerStyle = ""
    export let errorElementStyle = ""
    export let errorListContainerStyle = ""

    type T = $$Generic<ZodObject<any, any>>
    
    interface $$Slots {
        default: {
            schema: T
        }
    }
    export let schema: T
    

    const formData = writable<FormDataType>({})
    const dispatch = createEventDispatcher<{
        submit: {
            formData: z.infer<T>,
            setError: (formErrors: FormErrors<z.infer<T>>) => void
        },
    }>()
    const error = writable<ZodFormattedError<any, any>>({} as ZodFormattedError<any, any>)

    const onSubmit = (e: SubmitEvent & {currentTarget: EventTarget & HTMLFormElement}) => {
        const safeParsedOutput = schema.safeParse($formData)
        if(safeParsedOutput.success) return dispatch("submit", {
            formData: $formData,
            setError(formErrors) {
                if(formErrors._errors === undefined) formErrors._errors = []
                $error = formErrors as typeof $error
                let runNumber = 0
                const unsubscribe = formData.subscribe(() => {
                    if(runNumber == 0) return ++runNumber
                    $error = {_errors: []}
                    unsubscribe()
                })
            }
        })
        $error = safeParsedOutput.error.format()
        let runNumber = 0
        const unsubscribe = formData.subscribe(() => {
            if(runNumber == 0) return ++runNumber
            $error = {_errors: []}
            unsubscribe()
        })
    }

    setContext(FormData, formData)
    setContext(FormError, error)
    setContext(Schema, schema)
</script>
<form on:submit|preventDefault={onSubmit} class="better-form">
    <Error 
        errors={$error._errors}
        containerClass={errorContainerClass}
        containerStyle={errorContainerStyle}
        elementStyle={errorElementStyle}
        elementClass={errorElementClass}
        listErrorContainerClass={errorListContainerClass}
        listErrorContainerStyle={errorListContainerStyle}
    />
    <slot schema={schema}></slot>
</form>
<style lang="sass">
    .better-form 
        :global(.error)
            background-color: red
            border-radius: 1em
            padding: 0.2em 0.4em 0.2em 0
        :global(ul)
            margin: 0.2em
</style>