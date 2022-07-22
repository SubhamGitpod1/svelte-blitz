<script context="module" lang="ts">
	import {loadWithBlitz} from "app/blitz-client"
	import Title from "app/core/symbols/title"
	import {setContext} from "svelte"
	import {writable} from "svelte/store"

	export const load = loadWithBlitz(() => ({}))
</script>
<script lang="ts">
	import {dev} from "$app/env"

	let title = writable("blitz")
	setContext(Title, title)
	
	if(dev) title.subscribe(console.log)
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