<script lang="ts">
    import {AuthenticationError, type PromiseReturnType} from "blitz"
    import {createEventDispatcher} from "svelte"
    import type {z} from "zod"
    import {invoke} from "@blitzjs/sveltekit/rpc"
    import TextInput from "app/core/components/TextInput.svelte";
    import Form from "app/core/components/Form.svelte";
    import type {FormDataType} from "app/core/symbols/formData"
    import type FormErrors from "app/core/types/FormErrors"
    import login from "app/auth/mutations/login"
    import { Login } from "app/auth/validations"

    const dispatch = createEventDispatcher<{
        success: {
            user: PromiseReturnType<typeof login>
        }
    }>()
    const submit = async (e: CustomEvent<{
        formData: FormDataType,
        setError: (formErrors: FormErrors<z.infer<typeof Login>>) => void
    }> & {currentTarget: EventTarget | null}) => {
        const formData = e.detail.formData
        try {
            const user = await invoke(login, formData)
            dispatch("success", user)
        } catch(error: any) {
            if(error instanceof AuthenticationError) return e.detail.setError(
                {_errors: ["Sorry, those credentials are invalid"]}
            )
            e.detail.setError({
                _errors: [`Sorry, we had an unexpected error. Please try again. - ${error.toString()}`]
            })
        }
    }
</script>
<div>
    <h1>login</h1>
    <Form schema={Login} on:submit={submit} let:schema>
        <TextInput {schema} name="email" />
        <TextInput {schema} name="password" type="password" />
        <div>
            <a href="./forgot-password">Forgot your password?</a>
        </div>
        <button>login</button>
    </Form>
    <div style="margin-top: 1rem">
        or <a href="./signup">Sign up</a>
    </div>
</div>
