import { runSearch } from './src/lib/search';

function check(
	label: string,
	targets: string[],
	results: Awaited<ReturnType<typeof runSearch>>,
	expectAny: boolean
) {
	const targetSet = new Set(targets);
	let anyValid = false;
	for (const r of results) {
		const active = new Set(r.allActiveSkills);
		const missing = [...targetSet].filter((t) => !active.has(t));
		if (missing.length > 0) {
			console.log(
				`FAIL ${label}: ${r.mitama.map((m) => m.name).join('+')} missing ${missing.join(',')}`
			);
			return;
		}
		for (let i = 0; i < r.mitama.length; i++) {
			const pool = r.mitama[i].skills.slice(0, Math.min(r.mitama[i].skills.length, 11));
			for (const s of r.chosenSkills[i]) {
				if (!pool.includes(s)) {
					console.log(`FAIL ${label}: ${r.mitama[i].name} picked "${s}" not in pool`);
					return;
				}
			}
			if (r.chosenSkills[i].length > 3) {
				console.log(
					`FAIL ${label}: ${r.mitama[i].name} picked ${r.chosenSkills[i].length} > 3 skills`
				);
				return;
			}
		}
		anyValid = true;
	}
	if (expectAny && !anyValid) {
		console.log(`FAIL ${label}: expected at least one valid result, got 0 valid`);
		return;
	}
	if (!expectAny && results.length > 0) {
		console.log(`FAIL ${label}: expected 0 results, got ${results.length}`);
		return;
	}
	console.log(`PASS ${label}: ${results.length} results`);
}

async function main() {
	let res;

	// 1 mitama - single skill
	res = await runSearch({
		targetSkills: ['Attack up (Lv.2)'],
		settings: { numMitama: 1, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 10
	});
	check('1 mitama / 1 skill', ['Attack up (Lv.2)'], res, true);

	// 1 mitama - skill from fixed slot (skill 12)
	res = await runSearch({
		targetSkills: ['Protection of Heroes'],
		settings: { numMitama: 1, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 10
	});
	check('1 mitama / fixed skill', ['Protection of Heroes'], res, true);

	// 2 mitama - 2 skills
	res = await runSearch({
		targetSkills: ['Attack up (Lv.2)', 'Attack up (Lv.3)'],
		settings: { numMitama: 2, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 10
	});
	check('2 mitama / 2 skills', ['Attack up (Lv.2)', 'Attack up (Lv.3)'], res, true);

	// 3 mitama - 3 skills
	res = await runSearch({
		targetSkills: ['Swordsmanship', 'Chain', 'Fervor'],
		settings: { numMitama: 3, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 10
	});
	check('3 mitama / 3 skills', ['Swordsmanship', 'Chain', 'Fervor'], res, true);

	// type filter
	res = await runSearch({
		targetSkills: ['Swordsmanship'],
		settings: { numMitama: 1, allowedTypes: ['ATK'], allowedAges: [], allowedDifficulties: [] },
		maxResults: 10
	});
	check('1 mitama / type ATK', ['Swordsmanship'], res, true);

	// impossible combo (non-existent skill)
	res = await runSearch({
		targetSkills: ['Handful of Nothing'],
		settings: { numMitama: 2, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 10
	});
	check('impossible skill', ['Handful of Nothing'], res, false);

	// 3 mitama - 5 skills (verified via brute force)
	res = await runSearch({
		targetSkills: [
			'Attack up (Lv.2)',
			'Chain',
			'Swordsmanship',
			'Vitality (Time +5s)',
			'Random (Reduce)'
		],
		settings: { numMitama: 3, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 20
	});
	check(
		'3 mitama / 5 skills',
		['Attack up (Lv.2)', 'Chain', 'Swordsmanship', 'Vitality (Time +5s)', 'Random (Reduce)'],
		res,
		true
	);

	// 3 mitama - no valid combo (brute-force verified)
	res = await runSearch({
		targetSkills: [
			'Attack up (Lv.2)',
			'Chain',
			'Swordsmanship',
			'Vitality (Time +5s)',
			'Random (Reduce)'
		],
		settings: { numMitama: 2, allowedTypes: [], allowedAges: [], allowedDifficulties: [] },
		maxResults: 100
	});
	check(
		'2 mitama / 5 skills (impossible)',
		['Attack up (Lv.2)', 'Chain', 'Swordsmanship', 'Vitality (Time +5s)', 'Random (Reduce)'],
		res,
		false
	);
}

main().catch(console.error);
