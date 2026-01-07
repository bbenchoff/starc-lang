const https = require('https');
const fs = require('fs');
const { marked } = require('marked');

// Fetch StarC.md from GitHub
function fetchMarkdown() {
    return new Promise((resolve, reject) => {
        https.get('https://raw.githubusercontent.com/bbenchoff/bbenchoff.github.io/main/pages/StarC.md', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

// Clean markdown (same as client-side logic)
function cleanMarkdown(markdown) {
    let clean = markdown;

    // Remove frontmatter
    clean = clean.replace(/^---[\s\S]*?---\n/, '');

    // Remove style block
    clean = clean.replace(/<style>[\s\S]*?<\/style>\n/, '');

    // Remove Jekyll TOC widget
    clean = clean.replace(/<div class="tm-layout">[\s\S]*?<\/aside>\n/m, '');
    clean = clean.replace(/<div class="tm-article" markdown="1">\n/, '');
    clean = clean.replace(/<div class="starc-header">[\s\S]*?<\/div>\n/, '');

    // Remove --- dividers around part headers
    clean = clean.replace(/---\s*\n(\s*<div class="starc-part-header">)/g, '$1');
    clean = clean.replace(/(<\/div>)\s*\n---/g, '$1');

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
