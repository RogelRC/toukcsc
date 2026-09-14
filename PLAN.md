# Toukiden Custom Set Builder — Plan

## Overview

A client-side web app for finding optimal **mitama combinations** in Toukiden, similar to Athena's ASS for Monster Hunter. The user selects target skills, and the app finds all combinations of 1-3 mitama (with skill selection) that activate those skills.

**Based on:** `mhfucsc` repo structure (SvelteKit 2, Svelte 5 runes, Tailwind CSS v4, TypeScript)

---

## Toukiden Mitama Rules

- 300 mitama total (IDs 001-300)
- Each mitama has up to 12 skills (skill 12 is fixed/permanent when equipped)
- From skills 1-11, choose any 3 to activate
- Equip 1-3 mitama total
- So a full build = (3 chosen + 1 fixed) × number of mitama = up to 16 active skills
- Special case: Iyo (ID 077) has only 10 skills (skills 11 and 12 are empty)

---

## Data Model

### `src/toukiden_json/mitama.json`

```json
{
	"id": 1,
	"name": "Abe no Hirafu",
	"type": "DEF",
	"age": "Yore",
	"source": "Harrowhalf",
	"difficulty": "Normal",
	"location": "C5-7, P4-15",
	"isNewInKiwami": false,
	"skills": [
		"Recovery+ (Amplify)",
		"Vitality+ (Sturdy)",
		"Stamina (Lv. 2)",
		"Vitality (Time +5s)",
		"Protection (Lv. 2)",
		"Zeal (Stock +2)",
		"Panacea (Reduce)",
		"Protection (Lv. 3)",
		"DEF Master (Lure)",
		"Tranquility",
		"Taunt+ (Protect)",
		"Protection of Heroes"
	]
}
```

### `src/toukiden_json/types.json`

Array of all 10 mitama types: `["ATK", "DEF", "DCT", "HLG", "LCK", "PLN", "SPT", "SPC", "SPD", "SUP"]`

### `src/toukiden_json/skills.json`

Flat array of all unique skill names found across all mitama, for the skill picker:

```json
["Recovery+ (Amplify)", "Vitality+ (Sturdy)", ...]
```

### `src/toukiden_json/summary.json`

Metadata: `{ "mitamaCount": 300, "skillCount": N, "source": "Google Sheets" }`

---

## Search Algorithm

Much simpler than MHFU (no armor pieces, decorations, slots, or thresholds):

```
Input: targetSkills = ["Skill A", "Skill B", ...]  (1-8 skills)
Input: numMitama = 1 | 2 | 3

For each combination of `numMitama` mitama (C(300,1), C(300,2), C(300,3)):
  For each mitama in the combination:
    - Skill 12 is always active (if not empty)
    - Choose 3 from skills 1-11 (C(11,3) = 165 combos per mitama)

  Check if ALL targetSkills appear in the union of active skills
  If yes → record this combination + which skills were chosen from each

Optimizations:
  - Pre-index: for each unique skill name, which mitama have it (and at which pool position)
  - Early skip: if a target skill isn't available in ANY mitama in the current combo, prune
  - For 3-mitama search (~4.5M combos × 165³ = ~200B): use index-based pruning
    - First, find all mitama that have each target skill
    - Intersect to find candidate mitama sets
    - Only enumerate combos where every target skill is "coverable"
```

**Key optimization for 3-mitama search:**

1. Build `skillToMitama`: Map<string, {mitamaId, poolIndex}[]>
2. For each target skill, get the set of mitama that have it
3. Only consider mitama that appear in at least one target skill's set
4. For multi-mitama: use bitmask intersection to check coverage before enumerating skill picks

---

## UI Layout

Same structure as MHFU: left sidebar + right results panel.

```
┌──────────────────────────────────────────────────┐
│  HEADER: "Toukiden Mitama Set Builder"           │
├───────────────────┬──────────────────────────────┤
│  SIDEBAR          │  RESULTS                     │
│                   │                              │
│  Target Skills    │  - Sort controls             │
│  (skill picker)   │  - ResultCard list           │
│                   │                              │
│  Mitama Count     │  Each result shows:          │
│  (1 / 2 / 3)     │  - Selected mitama names     │
│                   │  - Active skills per mitama  │
│  Type Filter      │  - Skill 12 (fixed)          │
│  (checkboxes)     │  - Chosen skills 1-11        │
│                   │  - Total active skill count   │
│  Age Filter       │                              │
│  Difficulty Filter│                              │
│                   │                              │
│  [Search]         │                              │
│  Progress bar     │                              │
├───────────────────┴──────────────────────────────┤
│  FOOTER: Credits, GitHub link                    │
└──────────────────────────────────────────────────┘
```

### Result Card

```
┌─────────────────────────────────────────────┐
│ Mitama 1: Abe no Hirafu (DEF / Yore)       │
│   Fixed: Protection of Heroes               │
│   Chosen: Recovery+ (Amplify), Protection   │
│           (Lv. 3), DEF Master (Lure)        │
│                                             │
│ Mitama 2: Date Masamune (ATK / War)         │
│   Fixed: Mitama Pulse                       │
│   Chosen: Chain, Swordsmanship,             │
│           Expert Destroyer                  │
│                                             │
│ Active Skills (7):                          │
│ [Recovery+ (Amplify)] [Protection (Lv. 3)] │
│ [DEF Master (Lure)] [Protection of Heroes]  │
│ [Chain] [Swordsmanship] [Expert Destroyer]  │
│                                             │
│ [Copy] [Image]                              │
└─────────────────────────────────────────────┘
```

---

## Color Scheme

**Crimson/sakura theme** to match Toukiden's Japanese aesthetic:

- Background: `zinc-950` (same as MH apps)
- Cards: `zinc-900`
- Primary accent: **rose-500** (#f43f5e) — buttons, selected chips, focus rings
- Secondary accent: **rose-400** for links and highlights
- Skill chips: `rose-500/15 text-rose-300`
- Negative/empty: `zinc-500` for muted text
- Type badges: color-coded per type (ATK=red, DEF=blue, etc.)

---

## File Structure

```
toukcsc/
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── eslint.config.js
├── prettier.config.js
├── static/
│   └── robots.txt
└── src/
    ├── app.html
    ├── app.d.ts
    ├── toukiden_json/
    │   ├── mitama.json          (all 300 mitama)
    │   ├── types.json           (10 mitama types)
    │   ├── skills.json          (all unique skill names)
    │   └── summary.json         (metadata)
    ├── lib/
    │   ├── types.ts             (TypeScript interfaces)
    │   ├── gameData.ts          (data loaders, indexes)
    │   ├── search.ts            (combination search engine)
    │   ├── components/
    │   │   └── ResultCard.svelte
    │   └── assets/
    │       └── favicon.svg
    └── routes/
        ├── +layout.svelte
        ├── layout.css
        └── +page.svelte
```

---

## Implementation Steps

### Phase 1: Data Preparation

1. Parse the CSV into `mitama.json` (convert the raw CSV data into structured JSON)
2. Extract unique skill names into `skills.json`
3. Create `types.json` and `summary.json`

### Phase 2: Core App Setup

4. Initialize SvelteKit project with same deps as mhfucsc
5. Create `types.ts` with Toukiden-specific interfaces
6. Create `gameData.ts` with data loaders and skill indexes
7. Create `search.ts` with the combination search engine

### Phase 3: UI

8. Create `+page.svelte` with skill picker, filters, and search
9. Create `ResultCard.svelte` for displaying results
10. Create `+layout.svelte` and `layout.css`
11. Style everything with the rose/crimson theme

### Phase 4: Polish

12. Add localStorage persistence for search history
13. Add PNG export via html-to-image
14. Add copy-to-clipboard for results
15. Test with various skill combinations

---

## Key Differences from MHFU App

| Feature          | MHFU                            | Toukiden                               |
| ---------------- | ------------------------------- | -------------------------------------- |
| Equipment        | 5 armor pieces                  | 1-3 mitama                             |
| Skill source     | Skill trees + thresholds        | Direct skill names                     |
| Decorations      | Yes (fill gaps)                 | No                                     |
| Charms           | Yes                             | No                                     |
| Search logic     | Branch-and-bound DFS + knapsack | Combination enumeration + index lookup |
| Result           | Pieces + decos + materials      | Mitama + chosen skills                 |
| Skill activation | Points on tree ≥ threshold      | Skill is in chosen list                |
