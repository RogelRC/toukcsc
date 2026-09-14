import mitamaJson from '../toukiden_json/mitama.json';
import skillsJson from '../toukiden_json/skills.json';
import typesJson from '../toukiden_json/types.json';
import summaryJson from '../toukiden_json/summary.json';
import type { Mitama, MitamaType, MitamaAge, MitamaDifficulty } from './types';

export const mitama = mitamaJson as Mitama[];
export const allSkillNames = skillsJson as string[];
export const allTypes = typesJson as MitamaType[];
export const summary = summaryJson as {
	mitamaCount: number;
	skillCount: number;
	types: string[];
	source: string;
};

/** Index: skill name → list of mitama that have it (with pool position) */
export const skillToMitama = new Map<string, { mitamaId: number; poolIndex: number }[]>();
for (const m of mitama) {
	for (let i = 0; i < m.skills.length; i++) {
		const skill = m.skills[i];
		let list = skillToMitama.get(skill);
		if (!list) {
			list = [];
			skillToMitama.set(skill, list);
		}
		list.push({ mitamaId: m.id, poolIndex: i });
	}
}

/** Index: mitama ID → mitama object */
export const mitamaById = new Map<number, Mitama>();
for (const m of mitama) mitamaById.set(m.id, m);

/** All unique ages sorted */
export const allAges: MitamaAge[] = ['Chaos', 'Grace', 'Honor', 'Peace', 'War', 'Yore'];

/** All unique difficulties sorted */
export const allDifficulties: MitamaDifficulty[] = ['', 'Ex', 'Normal', 'Ultimate'];

/** Difficulty display label */
export function difficultyLabel(d: MitamaDifficulty): string {
	return d || 'Event';
}

/** Type color map */
const TYPE_COLORS: Record<MitamaType, string> = {
	ATK: '#ef4444',
	DEF: '#3b82f6',
	DCT: '#a855f7',
	HLG: '#22c55e',
	LCK: '#eab308',
	PLN: '#14b8a6',
	SPC: '#ec4899',
	SPD: '#f97316',
	SPT: '#06b6d4',
	SUP: '#6366f1'
};

export function typeColor(type: MitamaType): string {
	return TYPE_COLORS[type] ?? '#71717a';
}

/** The fixed skill (skill 12) for a mitama, or null if fewer than 12 skills */
export function fixedSkill(m: Mitama): string | null {
	return m.skills.length >= 12 ? m.skills[11] : null;
}

/** The selectable skills (skills 1-11) for a mitama */
export function selectableSkills(m: Mitama): string[] {
	return m.skills.slice(0, Math.min(m.skills.length, 11));
}
