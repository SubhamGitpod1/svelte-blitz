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
    import {getContext} from "svelte-typed-context"
    import {z} from "zod"
    import logo from "static/logo.png"
    import Title from "app/core/symbols/title"
    import Form from "app/core/components/Form.svelte"
    import TextInput from "app/core/components/TextInput.svelte"

    export let user: Awaited<ReturnType<typeof getCurrentUser>>

    const title = getContext(Title)
    $title = "Home"
</script>
<div class="container">
    <main>
        <div class="logo">
            <img src={logo} alt="blitz logo" width="256px" height="118px">
        </div>
        <p>
            <strong>Congrats!</strong> Your app is ready, including user sign-up and log-in.
        </p>
        <div class="buttons" style="margin-top: 1rem; margin-bottom: 1rem;">
            {#if user != null}
            <button
            class="button small"
            >
                Logout
            </button>
            <div>
                User id: <code>{user?.id}</code>
                <br />
                User role: <code>{user?.role}</code>
            </div>
            {:else}
                <a href="/auth/signup" class="button small">
                    <strong>Sign Up</strong>
                </a>
                <a href="/auth/login" class="button small">
                    <strong>Login</strong>
                </a>
            {/if}
        </div>
        <div class="buttons" style="margin-top: 5rem;">
            <a
              class="button"
              href="https://blitzjs.com/docs/getting-started?utm_source=blitz-new&utm_medium=app-template&utm_campaign=blitz-new"
              target="_blank"
              rel="noopener noreferrer"
            >
                Documentation
            </a>
            <a
              class="button-outline"
              href="https://github.com/blitz-js/blitz"
              target="_blank"
              rel="noopener noreferrer"
            >
                Github Repo
            </a>
            <a
              class="button-outline"
              href="https://discord.blitzjs.com"
              target="_blank"
              rel="noopener noreferrer"
            >
                Discord Community
            </a>
        </div>
    </main>
    <footer>
        <a
          href="https://blitzjs.com?utm_source=blitz-new&utm_medium=app-template&utm_campaign=blitz-new"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by Blitz.js
        </a>
    </footer>
</div>
<style global>
    @import url("https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@300;700&display=swap");

    html,
    body {
        padding: 0;
        margin: 0;
        font-family: "Libre Franklin", -apple-system, BlinkMacSystemFont, Segoe UI, Roboto,
            Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
    }

    * {
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        box-sizing: border-box;
    }
    .container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    main {
        padding: 5rem 0;
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    main p {
        font-size: 1.2rem;
    }

    p {
        text-align: center;
    }

    footer {
        width: 100%;
        height: 60px;
        border-top: 1px solid #eaeaea;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #45009d;
    }

    footer a {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    footer a {
        color: #f4f4f4;
        text-decoration: none;
    }

    .logo {
        margin-bottom: 2rem;
    }

    .logo img {
        width: 300px;
    }

    .buttons {
        display: grid;
        grid-auto-flow: column;
        grid-gap: 0.5rem;
    }
    .button {
        font-size: 1rem;
        background-color: #6700eb;
        padding: 1rem 2rem;
        color: #f4f4f4;
        text-align: center;
    }

    .button.small {
        padding: 0.5rem 1rem;
    }

    .button:hover {
        background-color: #45009d;
    }

    .button-outline {
        border: 2px solid #6700eb;
        padding: 1rem 2rem;
        color: #6700eb;
        text-align: center;
    }

    .button-outline:hover {
        border-color: #45009d;
        color: #45009d;
    }

    pre {
        background: #fafafa;
        border-radius: 5px;
        padding: 0.75rem;
        text-align: center;
    }
    code {
        font-size: 0.9rem;
        font-family: Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono,
            Bitstream Vera Sans Mono, Courier New, monospace;
    }

    .grid {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-wrap: wrap;

        max-width: 800px;
        margin-top: 3rem;
    }

    @media (max-width: 600px) {
        .grid {
            width: 100%;
            flex-direction: column;
        }
    }
</style>