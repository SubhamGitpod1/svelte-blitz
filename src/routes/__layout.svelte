<script context="module" lang="ts">
	import {loadWithBlitz} from "app/blitz-client"
	import Title from "app/core/symbols/title"
	import {setContext} from "svelte"
	import {writable} from "svelte/store"
	import Header from '$lib/header/Header.svelte';

	export const load = loadWithBlitz(() => ({}))
	console.log(import.meta.env.MODE)
</script>
<script lang="ts">
	let title = writable("blitz")
	setContext(Title, title)
	title.subscribe(console.log)
</script>

<svelte:head>
	<title>{$title}</title>
	<link rel="icon" href="/favicon.ico" />
	{@html 
	import.meta.env.DEV ? `
		<script src="//cdn.jsdelivr.net/npm/eruda"></script>
		<script>eruda.init();</script>
	` : ""
	}
</svelte:head>

<main>
	<slot />
</main>