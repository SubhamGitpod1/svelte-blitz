<script lang="ts">
    import {getContext} from "svelte-typed-context"
    import {writable} from "svelte/store"
    import {createEventDispatcher} from "svelte"
    import {type ZodObject, z} from "zod"
    import J$ from "jquery"
    import type keyofType from "keyofType"
    import FormError from "app/core/symbols/FormError"
    import setValue from "app/core/hooks/setValue"
    import Schema from "app/core/symbols/Schema"


    import Error from "app/core/components/Error.svelte"
    export let errorContainerClass = "error"
    export let errorElementClass = ""
    export let errorListContainerClass = ""
    export let errorContainerStyle = ""
    export let errorElementStyle = ""
    export let errorListContainerStyle = ""

    type T = $$Generic<ZodObject<any, any>>
    const dispatch = createEventDispatcher<{
        blur: null,
        error: {
            errors: string[]
        }
    }>()

    export let value: string | null = null;
    export let allowEmpty = false
    export let name: keyofType<z.infer<T>, string>
    $: Name = name as string
    export let schema: T = z.object({
        [name]: z.string()
    }) as T
    export let id = name as string
    $: id = name as string
    export let type: "text" | "password" | "email" = "text"
    export let style: string = ""
    export let containerStyle = ""
    export let containerClass = ""
    export let labelStyle = ""
    export let labelClass = ""
    export let persistErrorOnInput = false
    let className: string = ""
    export {className as class}
    let errors = [] as string[]
    const formError = getContext(FormError)
    $: errors = $formError?.[name]?._errors ?? []
    const Value = writable<string | null>(value )
    $: $Value = allowEmpty ? ($Value ?? "") : ($Value?.length ?? 0) < 1 ? null : $Value
    setValue(Value, id as string)
    $: value = $Value

    $: inputSchema = getContext(Schema)?.shape[name] ?? schema.shape[name]

    function blur(e: FocusEvent & {currentTarget: EventTarget & HTMLInputElement}) {
        dispatch("blur")
        const safeParseOutput = inputSchema.safeParse(value)
        if(safeParseOutput.success) {
            formError?.update(formError => {
                delete formError[Name]
                return formError
            })
        }
        e.preventDefault()
        errors = safeParseOutput.error.format()._errors
        $formError = {
            ...($formError),
            [name]: {
                _errors: errors
            }
        } as typeof $formError
        dispatch("error", {errors})
        persistErrorOnInput || J$(e.currentTarget).one("input", () => formError?.update(formError => {
                (delete formError[Name] || true) || formError
                return formError
        }))

    }

    function setTypeAction(node: HTMLInputElement) {
        node.type = type
    }
</script>
<div style={containerStyle} class="input-container {containerClass}">
    <label for={id} style={labelStyle} class={labelClass}>
        <slot>{Name}</slot>
    </label>
    <input 
        use:setTypeAction 
        {id} 
        name={Name} 
        bind:value={$Value}
        class={className}
        {style}
        on:change
        on:blur={blur}
        on:focus
        on:input
        on:abort
        on:keydown
        on:keypress
        on:dblclick
        on:click
    >

    <Error 
    {errors}
    container-class={errorContainerClass}
    container-style={errorContainerStyle}
    element-style={errorElementStyle}
    element-class={errorElementClass}
    list-error-container-class={errorListContainerClass}
    list-error-container-style={errorListContainerStyle}
    />
</div>


<style lang="sass">
    .input-container 
        :global(.error)
            background-color: red
            border-radius: 0 1em 1em 1em
            padding: 0.2em 0.4em 0.2em 0
        & :global(.error ul), & :global(.error p)
            margin: 0.2em
</style>