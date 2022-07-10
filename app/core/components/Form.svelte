<script lang="ts">
    import {setContext} from "svelte-typed-context"
    import {writable} from "svelte/store"
    import {createEventDispatcher} from "svelte"
    import FormData, {type FormDataType} from "app/core/symbols/formData"
    const formData = writable<FormDataType>({})
    const dispatch = createEventDispatcher<{submit: {formData: FormDataType}}>()

    const onSubmit = (e: SubmitEvent) => {
        dispatch("submit", {formData: $formData})
    }

    setContext(FormData, formData)

</script>
<h2>{JSON.stringify($formData, null, 4)}</h2>
<form on:submit|preventDefault={onSubmit}>
    <slot></slot>
</form>