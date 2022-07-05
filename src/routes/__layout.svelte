<script context="module" lang="ts">
	import {loadWithBlitz} from "app/blitz-client"
	import {setContext} from "svelte"
	import {writable} from "svelte/store"
	import Header from '$lib/header/Header.svelte';
	import '../app.css';

	export const load = loadWithBlitz(() => ({}))
	console.log(import.meta.env.MODE)
</script>
<script lang="ts">
	let title = writable("blitz")
	
</script>
<svelte:head>
	{@html `<script src="node_modules/eruda/eruda.js"></script>
	<script>eruda.init();</script>`}
</svelte:head>

<Header />

<main>
	<slot />
</main>

<footer>
	<p>visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to learn SvelteKit</p>
</footer>

<style>
	main {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		width: 100%;
		max-width: 1024px;
		margin: 0 auto;
		box-sizing: border-box;
	}

	footer {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		padding: 40px;
	}

	footer a {
		font-weight: bold;
	}

	@media (min-width: 480px) {
		footer {
			padding: 40px 0;
		}
	}
</style>
