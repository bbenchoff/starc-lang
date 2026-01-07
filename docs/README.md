# StarC Documentation Build System

This directory contains the static documentation build system for StarC.

## How it works

The documentation is automatically fetched from `StarC.md` in the bbenchoff.github.io repo and converted to a static, SEO-friendly HTML file.

### Files

- `template.html` - HTML template with all styling and structure
- `build-docs.js` - Node.js script that fetches StarC.md and generates static HTML
- `package.json` - Node.js dependencies (marked.js for markdown parsing)
- `index.html` - **Generated file** - the final static documentation (don't edit manually!)

### Build Process

The build script:
1. Fetches StarC.md from GitHub
2. Strips Jekyll frontmatter and HTML widgets
3. Converts markdown to HTML using marked.js
4. Processes collapsible code blocks
5. Fixes image URLs (logos → /img/logo2.svg, content images → bbenchoff.github.io)
6. Generates table of contents from headings
7. Injects content into template.html
8. Writes to index.html

### Local Build

```bash
cd docs
npm install
node build-docs.js
```

### Automated Build

GitHub Actions automatically rebuilds the docs:
- **Daily at 6am UTC** - checks for StarC.md updates
- **On manual trigger** - via workflow_dispatch
- **On build script changes** - when build-docs.js or the workflow is modified

The action commits and pushes changes to index.html if StarC.md has been updated.

### SEO Benefits

The generated docs are:
- ✅ Fully static HTML (no client-side fetching)
- ✅ Crawlable by search engines
- ✅ Fast loading (no JavaScript required for content)
- ✅ Shareable URLs with anchor links
- ✅ Includes meta descriptions

### Maintenance

- Keep `StarC.md` as the source of truth in bbenchoff.github.io
- Edit `template.html` to change styling/structure
- Edit `build-docs.js` to change processing logic
- Run `node build-docs.js` locally to test changes before pushing
