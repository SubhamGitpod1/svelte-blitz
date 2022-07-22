<script lang="ts">
    import {getContext} from "svelte-typed-context"
    import { invoke } from "@blitzjs/sveltekit/rpc";
    import TextInput from "app/core/components/TextInput.svelte";
    import Form from "app/core/components/Form.svelte";
    import {ForgotPassword} from "app/auth/validations"
    import forgotPassword from "app/auth/mutations/forgotPassword";
    import Title from "app/core/symbols/title"
    import type { SubmitHandler } from "app/core/types/formEvents";

    let isSuccess = false
    const submitHandler: SubmitHandler<typeof ForgotPassword> = async e => {
        try {
            await invoke(forgotPassword, e.detail.formData)
            isSuccess = true
        } catch {
            e.detail.setError({
                _errors: ["Sorry, we had an unexpected error. Please try again."]
            })
        }
    }

    const title = getContext(Title)
    $title = "Forgot Your Password?"
</script>
<h1>Forgot Your Password?</h1>

{#if isSuccess}
    <div>
        <h2>Request Submitted</h2>
        <p>
            If your email is in our system, you will receive instructions to reset your password
            shortly.
        </p>
    </div>
{:else}
    <Form schema={ForgotPassword} on:submit={submitHandler} let:schema>
        <TextInput {schema} name="email" />
        <button>Send Reset Password Instructions</button>
    </Form>
{/if}