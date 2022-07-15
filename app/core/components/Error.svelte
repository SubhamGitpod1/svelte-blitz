<script lang="ts">
    export let errors: string[] | null
    export let containerClass = "error"
    export let elementClass = ""
    export let listErrorContainerClass = ""
    export let containerStyle = ""
    export let elementStyle = ""
    export let listErrorContainerStyle = ""
    $: console.log(errors)
</script>

{#if (errors?.length ?? 0) > 0}
    <div class={containerClass} style={containerStyle}>
        {#if errors?.length === 1}
            <p class={elementClass} style={elementStyle}>{errors[0]}</p>
        {:else}
            <ul class={listErrorContainerClass} style={listErrorContainerStyle}>
                {#each errors ?? [] as error}
                    <li class={elementClass} style={elementStyle}>{error}</li>
                {/each}
            </ul>
        {/if}
    </div>
{/if}