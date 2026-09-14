export type MitamaType =
	'ATK' | 'DCT' | 'DEF' | 'HLG' | 'LCK' | 'PLN' | 'SPC' | 'SPD' | 'SPT' | 'SUP';

export type MitamaAge = 'Chaos' | 'Grace' | 'Honor' | 'Peace' | 'War' | 'Yore';

export type MitamaDifficulty = '' | 'Ex' | 'Normal' | 'Ultimate';

export interface Mitama {
	id: number;
	name: string;
	type: MitamaType;
	age: MitamaAge;
	source: string;
	difficulty: MitamaDifficulty;
	location: string;
	isNewInKiwami: boolean;
	skills: string[];
}

export interface MitamaCombo {
	mitama: Mitama[];
	chosenSkills: string[][];
	fixedSkills: (string | null)[];
	allActiveSkills: string[];
}

export interface SearchProgress {
	phase: string;
	nodes: number;
	found: number;
	done: boolean;
	aborted?: boolean;
}

export interface SearchSettings {
	numMitama: 1 | 2 | 3;
	allowedTypes: MitamaType[];
	allowedAges: MitamaAge[];
	allowedDifficulties: MitamaDifficulty[];
}
