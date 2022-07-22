<script lang="ts">
    import TextInput from "app/core/components/TextInput.svelte"
    import Form from "app/core/components/Form.svelte"
    import signup from "app/auth/mutations/signup"
    import {Signup} from "app/auth/validations"
    import {invoke} from "@blitzjs/sveltekit/rpc"
    import {createEventDispatcher} from "svelte"
    import type { SubmitHandler } from "app/core/types/formEvents";

    const dispatch = createEventDispatcher<{
        success: null
    }>()
    const submit: SubmitHandler<typeof Signup> = async e => {
        try {
            await invoke(signup, e.detail.formData)
            dispatch("success")
        } catch(error: any) {
            if (error.code === "P2002" && error.meta?.target?.includes("email")) {
                return e.detail.setError({
                    email: {
                        _errors: ["This email is already being used"]
                    }
                })
            }
            (error.message)
            e.detail.setError({_errors: [error.message ?? "Sorry, we had an unexpected error. Please try again."]})
        }
    }
</script>

<h1>Create an Account</h1>
<Form schema={Signup} on:submit={submit} let:schema>
    <TextInput {schema} name="email" />
    <TextInput {schema} name="password" type="password" />
    <button>Create Account</button>
</Form>