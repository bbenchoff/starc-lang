# StarC Language Website

Official website for StarC, a data-parallel programming language for 4,096 processors arranged in a 12-dimensional hypercube.

**Live site:** [starc-lang.org](https://starc-lang.org)

## What is StarC?

StarC is a C-like language designed for the **Thinkin' Machine**, a Connection Machine CM-1-inspired computer built from 4,096 RISC-V microcontrollers. It brings 1980s supercomputer thinking to modern hardware with:

- **SPMD execution** - Single Program, Multiple Data across all processors
- **Explicit communication** - Exchange blocks with bounded latency
- **Hypercube topology** - 12-dimensional hypercube with deterministic routing
- **Type safety** - Distinct types for per-processor (`pvar<T>`) and shared variables
- **Deterministic** - No race conditions, no deadlocks, predictable timing

## Repository Structure

```
starc-lang/
├── index.html              # Landing page
├── img/                    # Logo and assets
│   └── logo2.svg          # StarC logo
├── docs/                   # Documentation (auto-generated)
│   ├── index.html         # Static documentation page
│   ├── template.html      # Documentation template
│   ├── build-docs.js      # Build script
│   └── README.md          # Docs build system documentation
├── playground/             # Interactive playground (auto-deployed)
└── .github/workflows/      # GitHub Actions
    └── build-docs.yml     # Daily docs rebuild
```

## Automatic Deployments

### Documentation
The `/docs/` directory is automatically updated daily:
- Source: [StarC.md](https://github.com/bbenchoff/bbenchoff.github.io/blob/main/pages/StarC.md) from bbenchoff.github.io
- Process: GitHub Action fetches StarC.md, converts to static HTML
- Frequency: Daily at 6am UTC + manual triggers
- Output: SEO-friendly static HTML at [starc-lang.org/docs](https://starc-lang.org/docs/)

### Playground
The `/playground/` directory is automatically deployed from:
- Source repo: [StarCPlayground](https://github.com/bbenchoff/StarCPlayground)
- Trigger: Push to main branch in StarCPlayground
- Output: Interactive code editor at [starc-lang.org/playground](https://starc-lang.org/playground/)

## Local Development

### Landing Page
Edit `index.html` directly and push changes.

### Documentation
To rebuild docs locally:

```bash
cd docs
npm install
node build-docs.js
```

**Do not edit `docs/index.html` directly** - it's auto-generated. Edit the source markdown or the build process instead.

### Playground
Playground changes should be made in the [StarCPlayground repo](https://github.com/bbenchoff/StarCPlayground).

## Deployment

This site is hosted on **GitHub Pages** from the `main` branch.

Changes pushed to main are automatically deployed within 1-5 minutes.

## Links

- **Website:** [starc-lang.org](https://starc-lang.org)
- **Playground:** [starc-lang.org/playground](https://starc-lang.org/playground/)
- **Documentation:** [starc-lang.org/docs](https://starc-lang.org/docs/)
- **Blog:** [bbenchoff.github.io](https://bbenchoff.github.io/)

StarC language specification and implementation documented at [starc-lang.org/docs](https://starc-lang.org/docs/).
