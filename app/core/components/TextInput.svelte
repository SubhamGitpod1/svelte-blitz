<script lang="ts">
    import {getContext} from "svelte-typed-context"
    import {writable} from "svelte/store"
    import {createEventDispatcher} from "svelte"
    import {type ZodObject, z} from "zod"
    import type keyofType from "keyofType"
    import FormError from "app/core/symbols/FormError"
    import setValue from "app/core/hooks/setValue"
    import Schema from "app/core/symbols/Schema"

    type T = $$Generic<ZodObject<any, any>>
    const dispatch = createEventDispatcher<{
        blur: null
    }>()

    export let value: string | null = null;
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
    let className: string = ""
    export {className as class}
    let errors = [] as string[]
    const formError = getContext(FormError)
    $: errors = $formError?.[name]?._errors ?? []
    const Value = writable<string>(value ?? "")
    setValue(Value, id as string)
    $: value = $Value

    $: inputSchema = getContext(Schema)?.shape[name] ?? schema.shape[name]

    function blur(e: Event) {
        dispatch("blur")
        const safeParseOutput = inputSchema.safeParse(value)
        if(safeParseOutput.success) return
        e.preventDefault()
        errors = safeParseOutput.error.format()._errors
        $formError = {
            ...($formError),
            [name]: {
                _errors: errors
            }
        } as typeof $formError
    }

    function setTypeAction(node: HTMLInputElement) {
        node.type = type
    }
</script>
<div style={containerStyle} class={containerClass}>
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
    {#if errors.length > 0}
        <div class="error">
            <ul>
                {#each errors as error}
                    <li>{error}</li>
                {/each}
            </ul>
        </div>
    {/if}
</div>

<style lang="sass">
    .error
        background-color: red
        border-radius: 0 1em 1em 1em
        padding: 0.2em 0.4em 0.2em 0
        ul
            margin: 0.2em
</style>