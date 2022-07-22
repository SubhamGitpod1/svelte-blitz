<script>
    import LoginForm from "app/auth/components/LoginForm.svelte"
    import {getContext} from "svelte-typed-context"
    import Title from "app/core/symbols/title"
    import {goto} from "$app/navigation"

    const title = getContext(Title)
    $title = "Log In"
</script>

<LoginForm on:success={() => {
    goto("/")
}} />