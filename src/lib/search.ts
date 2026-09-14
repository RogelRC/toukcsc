import type { Mitama, MitamaCombo, SearchProgress, SearchSettings } from './types';
import { mitama } from './gameData';

export interface SearchParams {
	targetSkills: string[];
	settings: SearchSettings;
	maxResults?: number;
	onResult?: (result: MitamaCombo) => void;
}

function tick(): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, 0));
}

function filterCandidates(params: SearchParams): Mitama[] {
	const { allowedTypes, allowedAges, allowedDifficulties } = params.settings;
	return mitama.filter((m) => {
		if (allowedTypes.length > 0 && !allowedTypes.includes(m.type)) return false;
		if (allowedAges.length > 0 && !allowedAges.includes(m.age)) return false;
		if (allowedDifficulties.length > 0 && !allowedDifficulties.includes(m.difficulty)) return false;
		return true;
	});
}

interface PreparedMitama {
	mitama: Mitama;
	/** Bitmask of target skills covered by the fixed skill (skill 12). */
	fixedMask: number;
	/** Pickable target skills: { skillIndex(t) in target list, poolIndex } */
	pickable: { targetIdx: number; poolIndex: number }[];
	/** Selectable pool (skills 1-11) */
	pool: string[];
}

function prepare(m: Mitama, targetIdx: Map<string, number>): PreparedMitama {
	const fixed = m.skills.length >= 12 ? m.skills[11] : null;
	let fixedMask = 0;
	const pickable: { targetIdx: number; poolIndex: number }[] = [];
	const pool = m.skills.slice(0, Math.min(m.skills.length, 11));
	for (let i = 0; i < pool.length; i++) {
		const ti = targetIdx.get(pool[i]);
		if (ti !== undefined) pickable.push({ targetIdx: ti, poolIndex: i });
	}
	if (fixed) {
		const ti = targetIdx.get(fixed);
		if (ti !== undefined) fixedMask = 1 << ti;
	}
	return { mitama: m, fixedMask, pickable, pool };
}

const COMBINATORIAL_CAP = 20000;

/**
 * For a combo of prepared mitama, find all distinct target-cover assignments.
 * Each mitama picks <= 3 of its pickable target skills; fixed skills auto-cover.
 * Returns MitamaCombo results where chosenSkills[i] are the picked target
 * skill names (pool-index ordered). Assigned picks are minimal: a mitama only
 * picks target skills that are actually needed and assigned to it.
 */
function* enumerateAssignments(combo: PreparedMitama[]): Generator<MitamaCombo> {
	const n = combo.length;
	const targetCount = combo.reduce((max, p) => {
		for (const pk of p.pickable) if (pk.targetIdx + 1 > max) max = pk.targetIdx + 1;
		return max;
	}, 0);
	const full = targetCount === 0 ? 0 : (1 << targetCount) - 1;

	// Deadline recursion over mitama: assign subsets of their pickable targets.
	// State: covered bitmask. At each mitama, choose 0-3 target skills to pick.
	let nodes = 0;

	function* rec(
		depth: number,
		covered: number,
		chosen: string[][],
		pickedMasks: number[]
	): Generator<MitamaCombo> {
		if (++nodes > COMBINATORIAL_CAP) return;
		if (depth === n) {
			if (covered === full) {
				const allActiveSet = new Set<string>();
				const chosenFiltered: string[][] = [];
				for (let i = 0; i < n; i++) {
					// chosen[i] contains the selected target skills for mitama i
					const c = chosen[i];
					chosenFiltered.push([...c]);
					for (const s of c) allActiveSet.add(s);
				}
				for (let i = 0; i < n; i++) {
					const fixed = combo[i].mitama.skills.length >= 12 ? combo[i].mitama.skills[11] : null;
					if (fixed) allActiveSet.add(fixed);
				}
				yield {
					mitama: combo.map((c) => c.mitama),
					chosenSkills: chosenFiltered,
					fixedSkills: combo.map((c) =>
						c.mitama.skills.length >= 12 ? c.mitama.skills[11] : null
					),
					allActiveSkills: [...allActiveSet].sort()
				};
			}
			return;
		}

		const p = combo[depth];
		const fixedCov = p.fixedMask;

		// Subsets of pickable targets assigned to this mitama (size 0-3),
		// constrained to those not already covered (except fixed *this* mitama's).
		// We need to avoid emitting the same assignment in different orders of
		// picking among a mitama's target skills.
		const pick = p.pickable;

		// The set of new target indices this mitama could add.
		const available = pick.filter((pk) => !(covered & (1 << pk.targetIdx)));

		// Iterate over subsets of "available" of size 0..min(3, len).
		const maxPick = Math.min(3, available.length);
		for (let k = 0; k <= maxPick; k++) {
			// Generate combinations of size k from available
			function* combos(start: number, sz: number): Generator<number[]> {
				if (sz === 0) {
					yield [];
					return;
				}
				for (let i = start; i <= available.length - sz; i++) {
					for (const rest of combos(i + 1, sz - 1)) {
						yield [i, ...rest];
					}
				}
			}
			for (const comboIdxs of combos(0, k)) {
				let mask = fixedCov;
				const names: string[] = [];
				for (const ci of comboIdxs) {
					const pk = available[ci];
					mask |= 1 << pk.targetIdx;
					names.push(p.pool[pk.poolIndex]);
				}
				// Names in pool order for stable output
				names.sort((a, b) => p.pool.indexOf(a) - p.pool.indexOf(b));
				const newChosen = [...chosen];
				newChosen[depth] = names;
				yield* rec(depth + 1, covered | mask, newChosen, pickedMasks);
			}
		}
	}

	yield* rec(
		0,
		0,
		combo.map(() => []),
		[]
	);
}

async function searchCount(
	count: 1 | 2 | 3,
	prepared: PreparedMitama[],
	targetSet: string[],
	targetIdx: Map<string, number>,
	maxResults: number,
	onResult: ((result: MitamaCombo) => void) | undefined,
	onProgress: ((p: SearchProgress) => void) | undefined,
	progress: SearchProgress,
	signal?: AbortSignal
): Promise<MitamaCombo[]> {
	const results: MitamaCombo[] = [];
	const YIELD_EVERY = 20000;
	let nodes = 0;
	const targetBit = (s: string) => 1 << targetIdx.get(s)!;

	const comboPairMask = (a: PreparedMitama, b: PreparedMitama): number => {
		let mask = a.fixedMask | b.fixedMask;
		for (const pk of a.pickable) mask |= 1 << pk.targetIdx;
		for (const pk of b.pickable) mask |= 1 << pk.targetIdx;
		return mask;
	};

	const comboTripleMask = (a: PreparedMitama, b: PreparedMitama, c: PreparedMitama): number => {
		return (
			comboPairMask(a, b) | c.fixedMask | c.pickable.reduce((m, pk) => m | (1 << pk.targetIdx), 0)
		);
	};

	if (count === 1) {
		for (const p of prepared) {
			if (signal?.aborted) break;
			nodes++;
			if (nodes % YIELD_EVERY === 0) {
				await tick();
				progress.nodes = nodes;
				progress.found = results.length;
				onProgress?.({ ...progress });
			}
			// Fast check: can this single mitama produce all targets via its picks
			// and fixed? Need every target in its pool or fixed.
			let coverable = true;
			for (const t of targetSet) {
				const ti = targetIdx.get(t)!;
				const pi = p.pickable.some((pk) => pk.targetIdx === ti);
				const fi = (p.fixedMask & (1 << ti)) !== 0;
				if (!pi && !fi) {
					coverable = false;
					break;
				}
			}
			if (!coverable) continue;
			for (const r of enumerateAssignments([p])) {
				results.push(r);
				onResult?.(r);
				if (results.length >= maxResults) break;
			}
			if (results.length >= maxResults) break;
		}
	} else if (count === 2) {
		for (let i = 0; i < prepared.length; i++) {
			if (signal?.aborted) break;
			for (let j = i + 1; j < prepared.length; j++) {
				if (signal?.aborted) break;
				nodes++;
				if (nodes % YIELD_EVERY === 0) {
					await tick();
					progress.nodes = nodes;
					progress.found = results.length;
					progress.phase = `Searching... (${results.length} found)`;
					onProgress?.({ ...progress });
				}
				const combo = [prepared[i], prepared[j]];
				// Fast coverability: union of all pickable targets + fixed.
				const mask = comboPairMask(combo[0], combo[1]);
				let allCovered = true;
				for (let ti = 0; ti < targetSet.length; ti++) {
					if (!(mask & targetBit(targetSet[ti]))) {
						// no mitama in this pair can cover it at all
						if (ti >= 0) {
							allCovered = false;
							break;
						}
					}
				}
				if (!allCovered) continue;
				for (const r of enumerateAssignments(combo)) {
					results.push(r);
					onResult?.(r);
					if (results.length >= maxResults) break;
				}
				if (results.length >= maxResults) break;
			}
			if (results.length >= maxResults) break;
		}
	} else {
		for (let i = 0; i < prepared.length; i++) {
			if (signal?.aborted) break;
			for (let j = i + 1; j < prepared.length; j++) {
				if (signal?.aborted) break;
				for (let k = j + 1; k < prepared.length; k++) {
					if (signal?.aborted) break;
					nodes++;
					if (nodes % YIELD_EVERY === 0) {
						await tick();
						progress.nodes = nodes;
						progress.found = results.length;
						progress.phase = `Searching... (${results.length} found)`;
						onProgress?.({ ...progress });
					}
					const combo = [prepared[i], prepared[j], prepared[k]];
					const mask = comboTripleMask(prepared[i], prepared[j], prepared[k]);
					let allCovered = true;
					for (let ti = 0; ti < targetSet.length; ti++) {
						if (!(mask & targetBit(targetSet[ti]))) {
							allCovered = false;
							break;
						}
					}
					if (!allCovered) continue;
					for (const r of enumerateAssignments(combo)) {
						results.push(r);
						onResult?.(r);
						if (results.length >= maxResults) break;
					}
					if (results.length >= maxResults) break;
				}
				if (results.length >= maxResults) break;
			}
			if (results.length >= maxResults) break;
		}
	}

	return results;
}

export async function runSearch(
	params: SearchParams,
	onProgress?: (p: SearchProgress) => void,
	signal?: AbortSignal
): Promise<MitamaCombo[]> {
	if (params.targetSkills.length === 0) return [];

	const maxResults =
		params.maxResults ??
		(params.settings.numMitama === 1 ? 500 : params.settings.numMitama === 2 ? 200 : 100);

	const targetIdx = new Map<string, number>();
	params.targetSkills.forEach((t, i) => targetIdx.set(t, i));

	const progress: SearchProgress = {
		phase: 'Filtering mitama...',
		nodes: 0,
		found: 0,
		done: false
	};
	onProgress?.({ ...progress });

	const candidates = filterCandidates(params);

	const prepared = candidates
		.map((m) => prepare(m, targetIdx))
		.filter((p) => p.pickable.length > 0 || p.fixedMask !== 0);

	if (prepared.length === 0) {
		progress.done = true;
		progress.phase = 'No matching mitama found';
		onProgress?.({ ...progress });
		return [];
	}

	progress.phase = 'Searching...';

	const results = await searchCount(
		params.settings.numMitama,
		prepared,
		params.targetSkills,
		targetIdx,
		maxResults,
		params.onResult,
		onProgress,
		progress,
		signal
	);

	progress.done = true;
	progress.phase = results.length >= maxResults && maxResults > 0 ? 'Result limit reached' : 'Done';
	progress.found = results.length;
	onProgress?.({ ...progress });

	return results;
}
