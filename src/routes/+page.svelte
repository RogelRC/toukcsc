<script lang="ts">
	import ResultCard from '$lib/components/ResultCard.svelte';
	import {
		allSkillNames,
		allAges,
		allDifficulties,
		allTypes,
		difficultyLabel,
		typeColor
	} from '$lib/gameData';
	import { runSearch } from '$lib/search';
	import { onMount } from 'svelte';
	import type {
		MitamaCombo,
		MitamaType,
		MitamaAge,
		MitamaDifficulty,
		SearchProgress,
		SearchSettings
	} from '$lib/types';

	let targetSkills = $state<string[]>([]);
	let settings = $state<SearchSettings>({
		numMitama: 2,
		allowedTypes: [],
		allowedAges: [],
		allowedDifficulties: []
	});

	let skillQuery = $state('');

	let searching = $state(false);
	let searched = $state(false);
	let searchTime = $state(0);
	let toast = $state('');
	function showToast(msg: string) {
		toast = msg;
	}
	let results = $state<MitamaCombo[]>([]);
	let progress = $state<SearchProgress>({ phase: '', nodes: 0, found: 0, done: false });
	let controller: AbortController | null = null;

	let sortBy = $state<'skills' | 'mitama'>('skills');
	let sortDir = $state<'asc' | 'desc'>('desc');

	const LS = {
		targets: 'toukiden:targets',
		settings: 'toukiden:settings',
		sortby: 'toukiden:sortby',
		sortdir: 'toukiden:sortdir'
	};

	function readLS<T>(key: string): T | null {
		try {
			const raw = localStorage.getItem(key);
			return raw ? (JSON.parse(raw) as T) : null;
		} catch {
			return null;
		}
	}

	function writeLS(key: string, value: unknown) {
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {
			/* storage unavailable */
		}
	}

	let hydrated = $state(false);

	onMount(() => {
		const t = readLS<string[]>(LS.targets);
		if (t && Array.isArray(t)) targetSkills = t;
		const s = readLS<Partial<SearchSettings>>(LS.settings);
		if (s) settings = { ...settings, ...s };
		const sb = readLS<typeof sortBy>(LS.sortby);
		if (sb) sortBy = sb;
		const sd = readLS<typeof sortDir>(LS.sortdir);
		if (sd === 'asc' || sd === 'desc') sortDir = sd;
		hydrated = true;
	});

	$effect(() => {
		if (!hydrated) return;
		writeLS(LS.targets, targetSkills);
		writeLS(LS.settings, settings);
		writeLS(LS.sortby, sortBy);
		writeLS(LS.sortdir, sortDir);
	});

	const filteredSkills = $derived.by(() => {
		const q = skillQuery.toLowerCase().trim();
		if (!q) {
			return allSkillNames;
		}
		return allSkillNames.filter((s) => s.toLowerCase().includes(q));
	});

	const resultCount = $derived(results.length);

	function addSkill(skill: string) {
		if (targetSkills.includes(skill)) return;
		if (targetSkills.length >= 8) return;
		targetSkills = [...targetSkills, skill];
		skillQuery = '';
	}

	function removeSkill(skill: string) {
		targetSkills = targetSkills.filter((s) => s !== skill);
	}

	function toggleType(type: MitamaType) {
		const idx = settings.allowedTypes.indexOf(type);
		if (idx >= 0) {
			settings.allowedTypes = settings.allowedTypes.filter((t) => t !== type);
		} else {
			settings.allowedTypes = [...settings.allowedTypes, type];
		}
	}

	function toggleAge(age: MitamaAge) {
		const idx = settings.allowedAges.indexOf(age);
		if (idx >= 0) {
			settings.allowedAges = settings.allowedAges.filter((a) => a !== age);
		} else {
			settings.allowedAges = [...settings.allowedAges, age];
		}
	}

	function toggleDifficulty(diff: MitamaDifficulty) {
		const idx = settings.allowedDifficulties.indexOf(diff);
		if (idx >= 0) {
			settings.allowedDifficulties = settings.allowedDifficulties.filter((d) => d !== diff);
		} else {
			settings.allowedDifficulties = [...settings.allowedDifficulties, diff];
		}
	}

	const displayResults = $derived.by(() => {
		const withIdx = results.map((r, i) => ({ r, i }));
		withIdx.sort((a, b) => {
			let va: number, vb: number;
			if (sortBy === 'skills') {
				va = a.r.allActiveSkills.length;
				vb = b.r.allActiveSkills.length;
			} else {
				va = a.r.mitama.length;
				vb = b.r.mitama.length;
			}
			if (va !== vb) return sortDir === 'desc' ? vb - va : va - vb;
			return a.i - b.i;
		});
		return withIdx.map((x) => x.r);
	});

	let showScrollTop = $state(false);
	let showFab = $state(false);

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	onMount(() => {
		function onScroll() {
			const scrolled = window.scrollY > 200;
			showScrollTop = scrolled;
			showFab = scrolled;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	async function doSearch() {
		if (targetSkills.length === 0) {
			showToast('Select at least one target skill.');
			return;
		}
		controller = new AbortController();
		searching = true;
		searched = true;
		results = [];
		searchTime = 0;
		progress = { phase: 'Starting...', nodes: 0, found: 0, done: false };
		const t0 = performance.now();
		try {
			const found = await runSearch(
				{
					targetSkills,
					settings,
					onResult: (res) => {
						results = [...results, res];
					}
				},
				(p) => {
					progress = p;
				},
				controller.signal
			);
			results = found;
		} catch (e) {
			console.error(e);
			showToast('Search failed.');
		} finally {
			searching = false;
			searchTime = performance.now() - t0;
		}
	}

	function stopSearch() {
		controller?.abort();
	}
</script>

<div class="grid gap-6 lg:grid-cols-[400px_1fr]">
	<!-- Sidebar -->
	<aside id="search-form" class="min-w-0 space-y-5">
		<!-- Target Skills -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
				Target Skills
			</h2>
			<div class="relative mb-3">
				<input
					type="text"
					placeholder="Search skills..."
					bind:value={skillQuery}
					class="w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-rose-500 focus:outline-none"
				/>
			</div>

			<!-- Selected skills -->
			{#if targetSkills.length > 0}
				<div class="mb-3 flex flex-wrap gap-1.5">
					{#each targetSkills as skill (skill)}
						<span
							class="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200"
						>
							{skill}
							<button
								class="ml-0.5 text-rose-400/70 hover:text-rose-300"
								aria-label="Remove {skill}"
								onclick={() => removeSkill(skill)}
							>
								✕
							</button>
						</span>
					{/each}
				</div>
			{/if}

			<!-- Skill suggestions -->
			<div class="max-h-72 overflow-y-auto rounded border border-zinc-800">
				{#each filteredSkills as skill (skill)}
					<button
						class="flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-zinc-800/60 {targetSkills.includes(
							skill
						)
							? 'bg-rose-500/10'
							: ''}"
						onclick={() => addSkill(skill)}
						disabled={targetSkills.includes(skill)}
					>
						<span class:text-rose-300={targetSkills.includes(skill)}>
							{skill}
						</span>
						{#if !targetSkills.includes(skill)}
							<span class="text-zinc-600">+</span>
						{/if}
					</button>
				{:else}
					<div class="px-3 py-2 text-sm text-zinc-500">No skills found</div>
				{/each}
			</div>
		</section>

		<!-- Mitama Count -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-300 uppercase">Mitama Count</h2>
			<div class="flex overflow-hidden rounded border border-zinc-700">
				{#each [1, 2, 3] as n (n)}
					<button
						class="flex-1 px-3 py-1.5 text-xs transition-colors {settings.numMitama === n
							? 'bg-rose-500/20 text-rose-300'
							: 'text-zinc-400 hover:bg-zinc-800'}"
						onclick={() => (settings.numMitama = n as 1 | 2 | 3)}
					>
						{n} Mitama{n > 1 ? 's' : ''}
					</button>
				{/each}
			</div>
		</section>

		<!-- Type Filter -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-300 uppercase">Type Filter</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each allTypes as type (type)}
					<button
						class="rounded border px-2 py-1 text-xs font-medium transition-colors"
						class:border-zinc-700={!settings.allowedTypes.includes(type)}
						class:text-zinc-500={!settings.allowedTypes.includes(type)}
						class:hover:border-rose-500={!settings.allowedTypes.includes(type)}
						class:hover:text-rose-300={!settings.allowedTypes.includes(type)}
						style={settings.allowedTypes.includes(type)
							? `border-color: ${typeColor(type)}; background-color: ${typeColor(type)}20; color: ${typeColor(type)}`
							: ''}
						onclick={() => toggleType(type)}
					>
						{type}
					</button>
				{/each}
			</div>
			{#if settings.allowedTypes.length > 0}
				<button
					class="mt-2 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-rose-500 hover:text-rose-300"
					onclick={() => (settings.allowedTypes = [])}
				>
					Clear
				</button>
			{/if}
		</section>

		<!-- Age Filter -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-300 uppercase">Age Filter</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each allAges as age (age)}
					<button
						class="rounded border px-2 py-1 text-xs font-medium transition-colors {settings.allowedAges.includes(
							age
						)
							? 'border-rose-500 bg-rose-500/20 text-rose-300'
							: 'border-zinc-700 text-zinc-500 hover:border-rose-500 hover:text-rose-300'}"
						onclick={() => toggleAge(age)}
					>
						{age}
					</button>
				{/each}
			</div>
			{#if settings.allowedAges.length > 0}
				<button
					class="mt-2 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-rose-500 hover:text-rose-300"
					onclick={() => (settings.allowedAges = [])}
				>
					Clear
				</button>
			{/if}
		</section>

		<!-- Difficulty Filter -->
		<section class="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
			<h2 class="mb-3 text-sm font-semibold tracking-wide text-zinc-300 uppercase">
				Difficulty Filter
			</h2>
			<div class="flex flex-wrap gap-1.5">
				{#each allDifficulties as diff (diff)}
					<button
						class="rounded border px-2 py-1 text-xs font-medium transition-colors {settings.allowedDifficulties.includes(
							diff
						)
							? 'border-rose-500 bg-rose-500/20 text-rose-300'
							: 'border-zinc-700 text-zinc-500 hover:border-rose-500 hover:text-rose-300'}"
						onclick={() => toggleDifficulty(diff)}
					>
						{difficultyLabel(diff)}
					</button>
				{/each}
			</div>
			{#if settings.allowedDifficulties.length > 0}
				<button
					class="mt-2 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-rose-500 hover:text-rose-300"
					onclick={() => (settings.allowedDifficulties = [])}
				>
					Clear
				</button>
			{/if}
		</section>

		<!-- Search Button (desktop) -->
		<div class="hidden lg:block">
			<button
				class="w-full rounded bg-rose-500 px-4 py-2.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
				onclick={doSearch}
				disabled={searching || targetSkills.length === 0}
			>
				{#if searching}
					Searching...
				{:else}
					Search
				{/if}
			</button>
			{#if searching}
				<button
					class="mt-2 w-full rounded border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-rose-500 hover:text-rose-300"
					onclick={stopSearch}
				>
					Stop
				</button>
			{/if}
		</div>

		<!-- Progress (desktop) -->
		{#if progress.phase}
			<div class="hidden text-xs text-zinc-500 lg:block">
				<div class="mb-1">{progress.phase}</div>
				{#if progress.nodes > 0}
					<div class="h-1.5 overflow-hidden rounded bg-zinc-800">
						<div
							class="h-full bg-rose-500 transition-all"
							style="width: {progress.done ? '100' : '50'}%"
						></div>
					</div>
					<div class="mt-1">Nodes: {progress.nodes.toLocaleString()} | Found: {progress.found}</div>
				{/if}
			</div>
		{/if}
	</aside>

	<!-- Results -->
	<section class="min-w-0">
		{#if searched}
			<div class="mb-4 flex items-center justify-between">
				<h2 class="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
					Results
					<span class="ml-2 text-xs font-normal text-zinc-500">
						({resultCount})
						{#if searchTime > 0}
							<span class="text-zinc-600">· {(searchTime / 1000).toFixed(1)}s</span>
						{/if}
					</span>
				</h2>
				{#if results.length > 0}
					<div class="flex items-center gap-2">
						<select
							class="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-1 text-xs text-zinc-300"
							bind:value={sortBy}
						>
							<option value="skills">Active Skills</option>
							<option value="mitama">Mitama Count</option>
						</select>
						<button
							class="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-rose-500 hover:text-rose-300"
							onclick={() => (sortDir = sortDir === 'desc' ? 'asc' : 'desc')}
						>
							{sortDir === 'desc' ? '↓' : '↑'}
						</button>
					</div>
				{/if}
			</div>

			{#if results.length === 0 && progress.done}
				<div
					class="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-800"
				>
					<div class="text-center">
						<div class="mb-1 text-sm text-zinc-400">No matching combinations found</div>
						<div class="text-xs text-zinc-600">
							Try different target skills or relax your filters
						</div>
					</div>
				</div>
			{:else}
				<div class="space-y-2">
					{#each displayResults as result, i (result.mitama.map((m) => m.id).join(',') + i)}
						<ResultCard {result} index={i} />
					{/each}
				</div>
			{/if}
		{:else}
			<div
				class="flex h-64 items-center justify-center rounded-lg border border-dashed border-zinc-800"
			>
				<div class="text-center">
					<div class="mb-1 text-sm text-zinc-400">Select target skills and click Search</div>
					<div class="text-xs text-zinc-600">Find optimal mitama combinations for your build</div>
				</div>
			</div>
		{/if}
	</section>
</div>

<!-- Back to top -->
<button
	type="button"
	onclick={scrollToTop}
	aria-label="Back to top"
	title="Back to top"
	class="fixed bottom-4 left-1/2 z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-lg text-zinc-300 shadow-lg transition-opacity hover:border-rose-500 hover:text-rose-300
		{showScrollTop ? 'opacity-100' : 'pointer-events-none opacity-0'}">↑</button
>

<!-- Mobile search FAB -->
<button
	type="button"
	onclick={doSearch}
	disabled={searching || targetSkills.length === 0}
	class="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all lg:hidden
		{showFab ? 'opacity-100' : 'pointer-events-none opacity-0'}
		{!searching && targetSkills.length > 0
		? 'bg-rose-500 text-zinc-950 ring-1 shadow-rose-500/30 ring-rose-300/50 hover:bg-rose-400'
		: 'cursor-not-allowed bg-zinc-800 text-zinc-500 ring-1 ring-zinc-700'}"
>
	{#if searching}
		<svg class="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			></path>
		</svg>
	{:else}
		<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
	{/if}
</button>

<!-- Toast modal -->
{#if toast}
	<div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
		<div
			class="pointer-events-auto flex max-w-sm flex-col gap-4 rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-4 shadow-2xl"
		>
			<p class="text-sm text-rose-300">{toast}</p>
			<button
				type="button"
				onclick={() => (toast = '')}
				class="self-end rounded bg-rose-500 px-4 py-1.5 text-sm font-bold text-zinc-950 hover:bg-rose-400"
			>
				OK
			</button>
		</div>
	</div>
{/if}
