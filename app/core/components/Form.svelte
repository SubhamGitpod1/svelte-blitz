<script lang="ts">
    import {setContext} from "svelte-typed-context"
    import {writable} from "svelte/store"
    import {createEventDispatcher} from "svelte"
    import FormData, {type FormDataType} from "app/core/symbols/formData"
    import FormError from "app/core/symbols/FormError"
    import Schema from "app/core/symbols/Schema"
    import type {ZodObject, z, ZodFormattedError} from "zod"

    type T = $$Generic<ZodObject<any, any>>
    console.log($$slots)
    
    interface $$Slots {
        default: {
            schema: T
        }
    }
    export let schema: T
    

    const formData = writable<FormDataType>({})
    const dispatch = createEventDispatcher<{submit: {formData: z.infer<T>}}>()
    const error = writable<ZodFormattedError<any, any>>({} as ZodFormattedError<any, any>)

    const onSubmit = (e: SubmitEvent) => {
        const safeParsedOutput = schema.safeParse($formData)
        if(safeParsedOutput.success) return dispatch("submit", {formData: $formData})
        $error = safeParsedOutput.error.format()
    }

    setContext(FormData, formData)
    setContext(FormError, error)
    setContext(Schema, schema)
</script>
<form on:submit|preventDefault={onSubmit}>
    {#if $error._errors?.length > 0}
        <div class="error">
            <ul>
                {#each $error._errors as error}
                    <li>{error}</li>
                {/each}
            </ul>
        </div>
    {/if}
    <slot schema={schema}></slot>
</form>
<style lang="sass">
    .error
        background-color: red
        border-radius: 1em
        padding: 0.2em 0.4em 0.2em 0
        ul
            margin: 0.2em
</style>