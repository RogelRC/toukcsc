import { runSearch } from './src/lib/search';

async function main() {
	for (const [label, targets, n] of [
		['loose 3-mitama', ['Attack up (Lv.2)'], 3],
		['medium 3-mitama', ['Attack up (Lv.2)', 'Chain', 'Swordsmanship'], 3],
		[
			'tight 3-mitama',
			['Attack up (Lv.2)', 'Chain', 'Swordsmanship', 'Vitality (Time +5s)', 'Random (Reduce)'],
			3
		],
		['loose 2-mitama', ['Attack up (Lv.2)'], 2],
		[
			'5-skill 3-mitama',
			['Attack up (Lv.2)', 'Chain', 'Swordsmanship', 'Vitality (Time +5s)', 'Random (Reduce)'],
			3
		]
	]) {
		const t0 = performance.now();
		const stats = { nodes: 0, phase: '' };
		const res = await runSearch(
			{
				targetSkills: targets,
				settings: { numMitama: n, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
				maxResults: 100
			},
			(p) => {
				stats.nodes = p.nodes;
				stats.phase = p.phase;
			}
		);
		const dt = ((performance.now() - t0) / 1000).toFixed(2);
		console.log(
			`${label}: ${res.length} results in ${dt}s | nodes=${stats.nodes} | ${stats.phase}`
		);
	}
}

main().catch(console.error);
