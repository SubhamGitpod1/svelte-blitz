<script lang="ts">
    import {goto} from "$app/navigation"
    import {getContext} from "svelte-typed-context"
    import SignupForm from "app/auth/components/SignupForm.svelte";
    import Title from "app/core/symbols/title"

    const title = getContext(Title)
    $title = "Sign Up"
</script>

<SignupForm on:success={() => goto("/")} />