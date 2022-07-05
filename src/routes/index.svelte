<script context="module" lang="ts">
    import {invoke} from "@blitzjs/sveltekit/rpc"
    import getCurrentUser from "app/users/queries/getCurrentUser"
    import type {Load} from ".svelte-kit/types/src/routes/__types/index"
    export const load: Load = async () => ({
        props: {
            user: await invoke(getCurrentUser, null)
        }
    })
</script>
<script lang="ts">
    export let user: Awaited<ReturnType<typeof getCurrentUser>>
</script>
<div class="container">
    <main>
        <div class="logo">

        </div>
    </main>
</div>