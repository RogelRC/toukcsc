<script lang="ts">
	import type { MitamaCombo } from '$lib/types';
	import { typeColor, fixedSkill } from '$lib/gameData';

	let { result, index = 0 }: { result: MitamaCombo; index?: number } = $props();

	let expanded = $state(false);
	let exporting = $state(false);

	async function exportImage() {
		if (!cardEl) return;
		expanded = true;
		exporting = true;
		const wm = cardEl.querySelector<HTMLElement>('[data-watermark]');
		if (wm) wm.style.display = '';
		await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
		try {
			const { toPng } = await import('html-to-image');
			const dataUrl = await toPng(cardEl, {
				pixelRatio: 2,
				backgroundColor: '#18181b',
				cacheBust: true,
				filter: (node) => !(node instanceof HTMLElement && node.hasAttribute('data-no-export'))
			});
			const a = document.createElement('a');
			a.href = dataUrl;
			a.download = `toukiden-set-${index + 1}.png`;
			a.click();
		} catch (e) {
			console.error(e);
		} finally {
			if (wm) wm.style.display = 'none';
			exporting = false;
		}
	}

	function copyText() {
		const lines: string[] = [];
		for (let i = 0; i < result.mitama.length; i++) {
			const m = result.mitama[i];
			const fixed = result.fixedSkills[i];
			const chosen = result.chosenSkills[i];
			lines.push(`Mitama ${i + 1}: ${m.name} (${m.type} / ${m.age})`);
			if (fixed) lines.push(`  Fixed: ${fixed}`);
			lines.push(`  Chosen: ${chosen.join(', ')}`);
			lines.push('');
		}
		lines.push(`Active Skills (${result.allActiveSkills.length}):`);
		lines.push(result.allActiveSkills.join(', '));
		navigator.clipboard.writeText(lines.join('\n'));
	}

	let cardEl = $state<HTMLElement>();
</script>

<div class="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900" bind:this={cardEl}>
	<!-- Watermark (hidden by default, shown on PNG export) -->
	<div
		data-watermark
		style="display:none"
		class="bg-zinc-950 px-4 py-1 text-center text-[11px] font-medium tracking-wide text-zinc-500"
	>
		toukcsc.vercel.app
	</div>

	<!-- Collapsible header -->
	<button
		type="button"
		class="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-zinc-800/60"
		onclick={() => (expanded = !expanded)}
	>
		<div class="flex items-center gap-2">
			<span class="text-sm font-bold text-rose-400">#{index + 1}</span>
			<div class="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
				{#each result.mitama as m, i (m.id)}
					{#if i > 0}
						<span class="text-zinc-600">+</span>
					{/if}
					<span class="flex items-center gap-1">
						<span
							class="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-medium text-rose-300"
							style="background-color: {typeColor(m.type)}20; color: {typeColor(m.type)}"
						>
							{m.type}
						</span>
						<span class="text-xs text-zinc-300">{m.name}</span>
					</span>
				{/each}
			</div>
		</div>
		<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
			{#each result.allActiveSkills.slice(0, 6) as skill (skill)}
				<span
					class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300"
				>
					{skill}
				</span>
			{/each}
			{#if result.allActiveSkills.length > 6}
				<span class="text-[11px] text-zinc-500">+{result.allActiveSkills.length - 6} more</span>
			{/if}
			<span class="ml-auto text-zinc-500">{expanded ? '▲' : '▼'}</span>
		</div>
	</button>

	{#if expanded}
		<div class="border-t border-zinc-800 px-4 py-3">
			{#each result.mitama as m, i (m.id)}
				<div class="mb-3 last:mb-0">
					<div class="mb-1.5 flex items-center gap-2">
						<span
							class="rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] font-medium text-rose-300"
							style="background-color: {typeColor(m.type)}20; color: {typeColor(m.type)}"
						>
							{m.type}
						</span>
						<span class="text-sm font-medium text-zinc-200">{m.name}</span>
						<span class="text-xs text-zinc-500">{m.age}</span>
						{#if m.isNewInKiwami}
							<span class="rounded bg-rose-500/15 px-1 py-0.5 text-[10px] text-rose-300"
								>Kiwami</span
							>
						{/if}
					</div>

					<div class="ml-2 space-y-1 text-xs">
						{#if fixedSkill(m)}
							<div class="flex items-center gap-1.5">
								<span class="w-12 text-zinc-500">Fixed:</span>
								<span class="rounded bg-rose-500/15 px-1.5 py-0.5 text-rose-300">
									{fixedSkill(m)}
								</span>
							</div>
						{/if}
						<div class="flex flex-wrap items-center gap-1.5">
							<span class="w-12 text-zinc-500">
								Picks ({result.chosenSkills[i].length}/3):
							</span>
							{#each result.chosenSkills[i] as skill (skill)}
								<span class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-300">
									{skill}
								</span>
							{/each}
						</div>
					</div>

					{#if i < result.mitama.length - 1}
						<div class="mt-2 border-b border-zinc-800/60"></div>
					{/if}
				</div>
			{/each}

			<!-- All active skills -->
			<div class="mt-3 rounded border border-zinc-800 bg-zinc-950/50 p-2">
				<div class="mb-1.5 text-[11px] font-medium text-zinc-500">
					All Active Skills ({result.allActiveSkills.length})
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each result.allActiveSkills as skill (skill)}
						<span
							class="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] font-medium text-emerald-300"
						>
							{skill}
						</span>
					{/each}
				</div>
			</div>

			<!-- Actions -->
			<div class="mt-3 flex gap-2" data-no-export>
				<button
					class="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-rose-500 hover:text-rose-300"
					onclick={copyText}
				>
					Copy
				</button>
				<button
					class="rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:border-rose-500 hover:text-rose-300"
					onclick={exportImage}
				>
					{exporting ? 'Exporting...' : 'Export Image'}
				</button>
			</div>
		</div>
	{/if}
</div>
