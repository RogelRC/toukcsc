import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const csvPath = join(__dirname, '..', 'data', 'mitama.csv');
const outDir = join(__dirname, '..', 'src', 'toukiden_json');

const raw = readFileSync(csvPath, 'utf-8');
const lines = raw.split('\n').filter((l) => l.trim());

// Skip metadata header (line 0), column headers (line 1), data starts at line 2
// Column headers are on line 1; data starts at line 2
const dataLines = lines.slice(2);

function parseCSVLine(line) {
	const fields = [];
	let current = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ',') {
				fields.push(current);
				current = '';
			} else {
				current += ch;
			}
		}
	}
	fields.push(current);
	return fields;
}

const mitama = [];
const allSkills = new Set();
const types = new Set();

for (const line of dataLines) {
	const fields = parseCSVLine(line);
	if (fields.length < 11) continue;

	const id = parseInt(fields[0], 10);
	if (isNaN(id)) continue;

	const name = fields[1];
	const isNewInKiwami = fields[3] === 'x';
	const type = fields[5];
	const age = fields[6];
	const source = fields[7];
	const difficulty = fields[8] === '-' ? '' : fields[8];
	const location = fields[9] || '';

	const skills = [];
	for (let i = 10; i < Math.min(fields.length, 22); i++) {
		const s = fields[i]?.trim();
		if (s) {
			skills.push(s);
			allSkills.add(s);
		}
	}

	types.add(type);

	mitama.push({
		id,
		name,
		type,
		age,
		source,
		difficulty,
		location,
		isNewInKiwami,
		skills
	});
}

// Sort mitama by ID
mitama.sort((a, b) => a.id - b.id);

// Sort skills alphabetically
const skillsList = [...allSkills].sort((a, b) => a.localeCompare(b));

// Sort types
const typesList = [...types].sort((a, b) => a.localeCompare(b));

// Write files
writeFileSync(join(outDir, 'mitama.json'), JSON.stringify(mitama, null, '\t'));
writeFileSync(join(outDir, 'skills.json'), JSON.stringify(skillsList, null, '\t'));
writeFileSync(join(outDir, 'types.json'), JSON.stringify(typesList, null, '\t'));
writeFileSync(
	join(outDir, 'summary.json'),
	JSON.stringify(
		{
			mitamaCount: mitama.length,
			skillCount: skillsList.length,
			types: typesList,
			source: 'Google Sheets - Toukiden Kiwami Checklist'
		},
		null,
		'\t'
	)
);

console.log(`Parsed ${mitama.length} mitama`);
console.log(`Found ${skillsList.length} unique skills`);
console.log(`Types: ${typesList.join(', ')}`);
