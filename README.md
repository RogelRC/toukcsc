# Toukiden Mitama Set Builder

> A mitama combination calculator for **Toukiden Kiwami** (PS4 / PSVita).

[![Production](https://img.shields.io/badge/Live-https%3A%2F%2Ftoukcsc.vercel.app-blue?style=flat-square&logo=vercel&logoColor=white&label=Production)](https://toukcsc.vercel.app/)

**Toukiden Mitama Set Builder** is a client-side tool that finds every mitama combination that activates the skills you want. Pick your target skills, choose how many mitama to equip (1–3), and the built-in search engine enumerates all viable combinations in a fraction of a second.

---

## ✨ Features

- **Complete Toukiden Kiwami data** — all 300 mitama across 10 types (ATK, DEF, DCT, HLG, LCK, PLN, SPT, SPC, SPD, SUP) with their full skill pools and fixed skills.
- **Skill target search** — select any skill (or up to 8) and get every mitama combination that activates them all.
- **1–3 mitama builds** — search single mitama, pairs, or full trios with optimal skill assignments.
- **Flexible filters** — narrow results by mitama type, age, or acquisition difficulty.
- **Search history** — your past searches and filters are saved locally for instant re-runs.
- **Export as image** — render any result as a PNG (with site watermark) to share with friends.
- **Copy to clipboard** — copy a plain-text breakdown of any set.

## 🧰 Tech Stack

- **[SvelteKit](https://kit.svelte.dev/)** — meta-framework
- **[Svelte 5](https://svelte.dev/)** — runes-based reactivity
- **[Tailwind CSS](https://tailwindcss.com/)** — styling
- **[TypeScript](https://www.typescriptlang.org/)** — type-safe data model and search engine
- **[Prettier](https://prettier.io/)** & **[ESLint](https://eslint.org/)** — code quality

## 📦 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ and npm

### Local development

```sh
# install dependencies
npm install

# start the dev server
npm run dev

# or start and open in the browser
npm run dev -- --open
```

### Scripts

| Command           | Description                          |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the development server         |
| `npm run build`   | Build the production bundle          |
| `npm run preview` | Preview the production build locally |
| `npm run check`   | Type-check with `svelte-check`       |
| `npm run lint`    | Run Prettier and ESLint              |
| `npm run format`  | Auto-format the codebase             |

## 🏗️ Project Structure

```
src/
├── lib/
│   ├── components/      # ResultCard component
│   ├── gameData.ts      # Mitama data loaders and skill indexes
│   ├── search.ts        # The mitama combination search engine
│   └── types.ts         # Shared TypeScript types
├── toukiden_json/       # Game data (mitama, skills, types, summary)
└── routes/
    ├── +layout.svelte   # App shell
    ├── +page.svelte     # Main app (search form + results)
    └── layout.css       # Global styles
```

## 🧪 Verifying the Search Engine

The search algorithm is covered by an independent correctness suite that also cross-checks against a brute-force enumerator:

```sh
npx tsx test-search.ts
```

## 🤝 Contributing

Bug reports, feature ideas and pull requests are welcome. If you find a bug, please [report it on Discord](https://discord.com/users/1136464673479340203).

## 📄 License

This project is a fan-made tool for _Toukiden Kiwami_ (© KOEI TECMO GAMES). It is not affiliated with or endorsed by KOEI TECMO. All game data belongs to their respective owners.
