<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>Toukiden Mitama Set Builder</title>
	<meta
		name="description"
		content="Find the best mitama combinations for Toukiden Kiwami. Select target skills and discover optimal 1-3 mitama builds."
	/>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-100">
	<header class="border-b border-zinc-800 bg-zinc-900/60">
		<div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4">
			<div
				class="flex aspect-square h-10 w-10 items-center justify-center rounded-lg bg-rose-500/15 text-xl text-rose-400 select-none"
			>
				⚔
			</div>
			<div>
				<h1 class="text-lg font-bold tracking-tight text-zinc-50">Toukiden Mitama Set Builder</h1>
				<p class="text-xs text-zinc-400">Find optimal mitama combinations for your build</p>
			</div>
		</div>
	</header>

	<main class="mx-auto max-w-7xl px-4 py-6">
		{@render children()}
	</main>

	<footer class="border-t border-zinc-800 px-4 py-4 text-center text-xs text-zinc-600">
		<p>
			<span class="mr-1">Found a bug?</span>
			<a
				href="https://discord.com/users/1136464673479340203"
				target="_blank"
				rel="noopener noreferrer"
				class="text-rose-400 hover:text-rose-300 hover:underline"
			>
				Report it on Discord
			</a>
		</p>
		<p class="mt-1">
			<span class="mr-1">Enjoying the project?</span>
			<a
				href="https://github.com/RogelRC/toukcsc"
				target="_blank"
				rel="noopener noreferrer"
				class="text-rose-400 hover:text-rose-300 hover:underline"
			>
				Star it on GitHub
			</a>
		</p>
	</footer>
</div>
