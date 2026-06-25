const https = require('https');
const fs = require('fs');
const { marked } = require('marked');

// Fetch StarC.md from the (private) bbenchoff.github.io repo.
//
// The repo is private, so raw.githubusercontent.com 404s for anonymous
// clients. The old unauthenticated https.get swallowed that 404 and baked the
// literal "404: Not Found" body into the published docs. We now use the
// authenticated Contents API and fail loudly on any non-200 so a fetch problem
// breaks the build instead of silently publishing garbage.
//
// Local testing: set STARC_MD_FILE to a local StarC.md path to skip the fetch.
function fetchMarkdown() {
    const localFile = process.env.STARC_MD_FILE;
    if (localFile) {
        console.log(`Reading StarC.md from local file: ${localFile}`);
        return Promise.resolve(fs.readFileSync(localFile, 'utf8'));
    }

    const token = process.env.DOCS_SOURCE_TOKEN;
    if (!token) {
        return Promise.reject(new Error(
            'DOCS_SOURCE_TOKEN is not set. bbenchoff.github.io is private, so the StarC.md ' +
            'fetch must be authenticated. Set DOCS_SOURCE_TOKEN to a PAT with read access to ' +
            'bbenchoff.github.io (or set STARC_MD_FILE to a local path for offline builds).'
        ));
    }

    const options = {
        hostname: 'api.github.com',
        path: '/repos/bbenchoff/bbenchoff.github.io/contents/pages/StarC.md?ref=main',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.raw',
            'User-Agent': 'starc-docs-builder',
            'X-GitHub-Api-Version': '2022-11-28'
        }
    };

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    reject(new Error(
                        `GitHub Contents API returned HTTP ${res.statusCode} for pages/StarC.md. ` +
                        `Check the token's access to bbenchoff.github.io. Body: ${data.slice(0, 200)}`
                    ));
                    return;
                }
                resolve(data);
            });
        }).on('error', reject);
    });
}

// Clean markdown (same as client-side logic)
function cleanMarkdown(markdown) {
    let clean = markdown;

    // Normalize CRLF -> LF first. StarC.md is saved with Windows line endings,
    // and every pattern below is anchored on a bare "\n" (e.g. "---\n",
    // "</style>\n", "</aside>\n"); without this, none of them match and the
    // frontmatter, <style> block, and TOC wrappers leak into the output.
    clean = clean.replace(/\r\n/g, '\n');

    // Remove frontmatter
    clean = clean.replace(/^---[\s\S]*?---\n/, '');

    // Remove style block
    clean = clean.replace(/<style>[\s\S]*?<\/style>\n/, '');

    // Remove Jekyll TOC widget
    clean = clean.replace(/<div class="tm-layout">[\s\S]*?<\/aside>\n/m, '');
    clean = clean.replace(/<div class="tm-article" markdown="1">\n/, '');
    clean = clean.replace(/<div class="starc-header">[\s\S]*?<\/div>\n/, '');

    // Remove the orphan closing tags of the tm-article / tm-layout wrappers.
    // Their opening tags are stripped above, but the matching closers live at
    // the very end of StarC.md, so without this they leak as stray </div>s that
    // unbalance the template's DOM.
    clean = clean.replace(/<\/div><!--\s*\/\.tm-(?:article|layout)\s*-->\n?/g, '');

    // Remove --- dividers around part headers
    clean = clean.replace(/---\s*\n(\s*<div class="starc-part-header">)/g, '$1');
    clean = clean.replace(/(<\/div>)\s*\n---/g, '$1');

    // Remove "back to main project page" footer
    clean = clean.replace(/\[back to main project page\]\(.*?\)\s*/gi, '');
    clean = clean.replace(/\*\*main\*\*\s*/gi, '');

    return clean;
}

// Process collapsible code blocks
function processCollapsibleCodeBlocks(html) {
    const collapsiblePattern = /<!--\s*COLLAPSIBLE\s*-->\s*(<pre><code[^>]*>[\s\S]*?<\/code><\/pre>)\s*<!--\s*\/COLLAPSIBLE\s*-->/gi;

    return html.replace(collapsiblePattern, (match, codeBlock) => {
        return `
            <div class="code-block-wrapper collapsible">
                <div class="code-block-header">
                    <span class="code-block-title">Code Example</span>
                    <span class="code-block-toggle">Show Code</span>
                </div>
                <div class="code-block-content">
                    ${codeBlock}
                </div>
            </div>
        `;
    });
}

// Fix image URLs
function fixImageUrls(html) {
    // Fix part header logos to use local logo
    html = html.replace(/(<div class="starc-part-header">[\s\S]*?<img[^>]*src=")([^"]+)(")/g, '$1/img/logo2.svg$3');

    // Fix content images to point to bbenchoff.github.io
    html = html.replace(/<img([^>]*)src="\/images\//g, '<img$1src="https://bbenchoff.github.io/images/');

    return html;
}

// Generate TOC from HTML
function generateTOC(html) {
    const headingPattern = /<h([123])([^>]*)>(.*?)<\/h\1>/gi;
    const headings = [];
    let match;

    while ((match = headingPattern.exec(html)) !== null) {
        const level = match[1];
        const attrs = match[2];
        let text = match[3];

        // Skip if it's in doc-header (though we removed that)
        // Generate ID if not present
        const idMatch = attrs.match(/id="([^"]+)"/);
        let id = idMatch ? idMatch[1] : text
            .toLowerCase()
            .replace(/<[^>]+>/g, '') // Remove any HTML tags
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/--+/g, '-');

        // If no ID in original, add it to the HTML
        if (!idMatch) {
            const newHeading = `<h${level} id="${id}"${attrs}>${text}</h${level}>`;
            html = html.replace(match[0], newHeading);
        }

        headings.push({ level, id, text: text.replace(/<[^>]+>/g, '') });
    }

    // Generate TOC HTML
    let tocHtml = '';
    headings.forEach(h => {
        tocHtml += `                <li><a href="#${h.id}" class="toc-h${h.level}">${h.text}</a></li>\n`;
    });

    return { html, tocHtml };
}

// Main build function
async function build() {
    console.log('Fetching StarC.md...');
    const markdown = await fetchMarkdown();

    console.log('Processing markdown...');
    const cleanMd = cleanMarkdown(markdown);

    console.log('Converting to HTML...');
    let html = marked.parse(cleanMd);

    console.log('Processing collapsible code blocks...');
    html = processCollapsibleCodeBlocks(html);

    console.log('Fixing image URLs...');
    html = fixImageUrls(html);

    console.log('Generating TOC...');
    const { html: finalHtml, tocHtml } = generateTOC(html);

    console.log('Building final HTML...');
    const template = fs.readFileSync(__dirname + '/template.html', 'utf8');
    const output = template
        .replace('<!-- CONTENT -->', finalHtml)
        .replace('<!-- TOC -->', tocHtml);

    console.log('Writing docs/index.html...');
    fs.writeFileSync(__dirname + '/index.html', output);

    console.log('Done!');
}

build().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
});
