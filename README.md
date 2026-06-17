# OpenFlowDB

[![CI](https://github.com/Praveenpn180/openflowdb/actions/workflows/ci.yml/badge.svg)](https://github.com/Praveenpn180/openflowdb/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Live demo](https://img.shields.io/badge/demo-openflowdb.vercel.app-6366f1)](https://openflowdb.vercel.app)

Open-source visual database schema designer. Draw ER diagrams in your browser, link tables with foreign keys, and export SQL or PNG — no sign-up required.

**Live demo:** [openflowdb.vercel.app](https://openflowdb.vercel.app)

## Features

- Visual canvas — pan, zoom, and drag tables on an infinite grid
- Relationships — connect columns to define foreign keys
- SQL export — PostgreSQL, MySQL, and SQLite DDL
- Import SQL — paste `CREATE TABLE` statements to generate a diagram
- Auto layout — force-directed graph layout for messy schemas
- Save & open — `.openflowdb.json` diagram files
- PNG export — share your schema as an image
- Local-first — auto-saved in the browser; your data stays on your device

## Quick start

Requires [Node.js](https://nodejs.org/) 20+ and [pnpm](https://pnpm.io/).

```bash
git clone https://github.com/Praveenpn180/openflowdb.git
cd openflowdb
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and go to the editor.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `pnpm dev`     | Start development server |
| `pnpm build`   | Production build         |
| `pnpm preview` | Preview production build |
| `pnpm lint`    | Run ESLint               |
| `pnpm format`  | Format with Prettier     |

## Tech stack

- [TanStack Start](https://tanstack.com/start) + [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [d3-force](https://github.com/d3/d3-force) for auto layout
- [Nitro](https://nitro.build/) for deployment

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © [Praveenpn180](https://github.com/Praveenpn180)
