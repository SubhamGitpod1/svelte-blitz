<script context="module" lang="ts">
	export const prerender = true;
	console.log(readCookie('blitz-cookie-prefix'));
	const onClick = async () => {
		try {
			console.log('clicked');
			const { default: getCurrentUser } = await import('app/users/queries/getCurrentUser');
			alert(getCurrentUser.toString());
			alert(await getCurrentUser(null, { session: {} } as any));
		} catch (err: any) {
			alert(JSON.stringify(err));
		}
	};
</script>

<script lang="ts">
	import Counter from '$lib/Counter.svelte';
	import type { Load } from '.svelte-kit/types/src/routes/todos/__types';
	import { readCookie } from 'blitz/dist/index-browser';
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<h1>
		<span class="welcome">
			<picture>
				<source srcset="svelte-welcome.webp" type="image/webp" />
				<img src="svelte-welcome.png" alt="Welcome" />
			</picture>
		</span>

		to your new<br />SvelteKit app
	</h1>

	<h2>
		try editing <strong>src/routes/index.svelte</strong>
	</h2>

	<Counter />
</section>
<button on:click={onClick}>click me!</button>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 1;
	}

	h1 {
		width: 100%;
	}

	.welcome {
		display: block;
		position: relative;
		width: 100%;
		height: 0;
		padding: 0 0 calc(100% * 495 / 2048) 0;
	}

	.welcome img {
		position: absolute;
		width: 100%;
		height: 100%;
		top: 0;
		display: block;
	}
</style>
