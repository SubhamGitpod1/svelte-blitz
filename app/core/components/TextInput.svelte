<script lang="ts">
    import {writable} from "svelte/store"
    import setValue from "app/core/hooks/setValue"
    
    export let value: string | null = null;
    export let name: string
    export let id: string = name
    export let type: "text" | "password" | "email" = "text"

    const Value = writable<string>(value ?? "")

    setValue(Value, id)
    Value.subscribe(Value => {
        value = Value
    })

    function setTypeAction(node: HTMLInputElement) {
        node.type = type
    }
</script>

<label for={id}>
    <slot>{name}</slot>
</label>
<input use:setTypeAction id={id} name={name} bind:value={$Value}>