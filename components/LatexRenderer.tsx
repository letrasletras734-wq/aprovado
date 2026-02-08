import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import 'katex/dist/katex.min.css';

interface LatexRendererProps {
    content: string;
    className?: string;
    previewMode?: boolean; // New prop for simpler rendering in lists
}

/**
 * Master LaTeX Pre-processor
 * Designed to handle full document structure, academic environments, 
 * complex mathematical notation, cross-references, and bibliography.
 */
const preprocessLatex = (latex: string, previewMode: boolean = false): string => {
    if (!latex || typeof latex !== 'string') return '';

    let mathBlocks: string[] = [];
    let processedText = latex;

    // 0. Comment Phase: Remove comments
    processedText = processedText.replace(/(^|[^\\])%.*/g, '$1');

    // 0.1 Color Definition Phase
    const colorMap: Record<string, string> = {
        azul: 'rgb(0, 51, 153)', // rgb(0, 0.2, 0.6)
        verde: 'rgb(0, 153, 76)', // rgb(0, 0.6, 0.3)
        vermelho: 'rgb(178, 0, 0)' // rgb(0.7, 0, 0)
    };

    // Parse \definecolor{name}{rgb}{r,g,b} or \definecolor{name}{RGB}{R,G,B}
    const defineColorRegex = /\\definecolor\{([^}]+)\}\{(rgb|RGB)\}\{([^}]+)\}/g;
    processedText = processedText.replace(defineColorRegex, (_, name, model, values) => {
        if (model === 'rgb') {
            const rgbValues = values.split(',').map((v: string) => {
                const val = parseFloat(v.trim());
                return isNaN(val) ? 0 : Math.round(val * 255);
            });
            colorMap[name] = `rgb(${rgbValues.join(',')})`;
        } else if (model === 'RGB') {
            colorMap[name] = `rgb(${values})`;
        }
        return ''; // Remove from text
    });

    // 0.2 Metadata Extraction Phase (Moved up to survive preamble stripping)
    let title = '';
    let author = '';
    let date = '';

    processedText = processedText.replace(/\\title\{([^}]+)\}/g, (_, t) => { title = t; return ''; });
    processedText = processedText.replace(/\\author\{([^}]+)\}/g, (_, a) => { author = a.replace(/\\and/g, ' & '); return ''; });
    processedText = processedText.replace(/\\date\{([^}]+)\}/g, (_, d) => { date = d; return ''; });

    // 0.3 Preamble Stripping Phase
    // If \begin{document} exists, discard everything before it (preamble)
    // This handles \documentclass, \usepackage, and other setup commands robustly
    if (/\\begin\s*\{document\}/.test(processedText)) {
        processedText = processedText.replace(/^[\s\S]*?\\begin\s*\{document\}/, '');
        processedText = processedText.replace(/\\end\s*\{document\}[\s\S]*$/, '');
    }

    // 0.2 Table & Figure Environment Phase (Remove wrappers but keep content)
    processedText = processedText.replace(/\\begin\{(table|figure|center)\*?\}([\s\S]*?)\\end\{\1\*?\}/g, (_, env, inner) => {
        // Extract caption if exists and convert to text
        let content = inner;
        content = content.replace(/\\caption\{([^}]+)\}/g, '\n\n**Legenda:** $1\n\n');
        return content;
    });

    // 0.3 Caption Standalone Phase
    processedText = processedText.replace(/\\caption\{([^}]+)\}/g, '\n\n**Legenda:** $1\n\n');

    // 1. Label & Citation Pre-scan (The "First Pass")
    const labels: Record<string, string> = {};
    const citations: Record<string, number> = {};
    let equationCount = 0;
    let sectionCount = 0;
    let citationCount = 0;

    // Scan for labels in the whole text before protection
    const labelRegex = /\\label\{([^}]+)\}/g;
    let match;
    while ((match = labelRegex.exec(processedText)) !== null) {
        const key = match[1];
        const pos = match.index;
        const before = processedText.substring(Math.max(0, pos - 100), pos);
        if (before.includes('\\section') || before.includes('\\chapter')) {
            sectionCount++;
            labels[key] = `${sectionCount}`;
        } else {
            equationCount++;
            labels[key] = `(${equationCount})`;
        }
    }

    // Scan for \bibitem
    const bibitemRegex = /\\bibitem\{([^}]+)\}/g;
    while ((match = bibitemRegex.exec(processedText)) !== null) {
        citationCount++;
        citations[match[1]] = citationCount;
    }

    // 2. Protection Phase: Hide math and verbatim
    const protect = (regex: RegExp, wrapper: (match: string, ...args: any[]) => string = (m) => m) => {
        processedText = processedText.replace(regex, (match, ...args) => {
            const placeholder = `@@BLOCK${mathBlocks.length}@@`;
            mathBlocks.push(wrapper(match, ...args));
            return placeholder;
        });
    };

    // Protect Verbatim
    protect(/\\begin\{verbatim\*?\}([\s\S]*?)\\end\{verbatim\*?\}/g, (_, inner) => {
        if (previewMode) return inner.substring(0, 100) + '...';
        return `\n\`\`\`\n${inner}\n\`\`\`\n`;
    });
    protect(/\\verb\*?\|([^|]+)\|/g, (_, inner) => `\`${inner}\``);
    protect(/\\verb\*?\+([^+]+)\+/g, (_, inner) => `\`${inner}\``);
    protect(/\\verb\*?\=([^=]+)\=/g, (_, inner) => `\`${inner}\``);

    // Protect Tabular/Array
    // Rule: Convert tabular to array for better KaTeX compatibility if needed, 
    // but we support HTML tables for better UI. We'll handle both.
    protect(/\\begin\{(tabular|array)\}\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (_, env, cols, body) => {
        if (previewMode) return '[Tabela]';

        // If it's already an array or we want to force math mode rendering
        if (env === 'array') {
            return `\n$$\n\\begin{array}{${cols}}${body}\\end{array}\n$$\n`;
        }

        // For tabular, we create a premium HTML table
        let html = '\n<div class="overflow-x-auto my-6"><table class="min-w-full border-collapse border border-gray-300 dark:border-gray-700 mx-auto text-sm">';
        const rows = body.trim().split(/\\\\/);
        rows.forEach(row => {
            const cleanRow = row
                .replace(/\\hline/g, '')
                .replace(/\\toprule/g, '')
                .replace(/\\midrule/g, '')
                .replace(/\\bottomrule/g, '')
                .replace(/\\cline\{[^}]+\}/g, '')
                .trim();
            if (!cleanRow) return;
            html += '<tr class="border-b border-gray-200 dark:border-gray-800">';
            const cells = cleanRow.split('&');
            cells.forEach(cell => {
                let cellContent = cell.trim();
                let cellStyle = '';

                // Handle \cellcolor{color}
                const cellColorMatch = cellContent.match(/\\cellcolor\{([^}]+)\}/);
                if (cellColorMatch) {
                    const colorName = cellColorMatch[1];
                    const resolvedColor = colorMap[colorName] || colorName;
                    cellStyle = `background-color: ${resolvedColor};`;
                    cellContent = cellContent.replace(/\\cellcolor\{[^}]+\}/, '').trim();
                }

                html += `<td class="border border-gray-300 dark:border-gray-700 px-4 py-2 text-center" ${cellStyle ? `style="${cellStyle}"` : ''}>${cellContent}</td>`;
            });
            html += '</tr>';
        });
        html += '</table></div>\n';
        return html;
    });

    // Helper to clean math blocks for KaTeX
    const cleanMath = (inner: string) => {
        let cleaned = inner.replace(/\\label\{[^}]+\}/g, '');
        // Resolve custom colors inside math for KaTeX
        cleaned = cleaned.replace(/\\textcolor\{([^}]+)\}/g, (_, color) => {
            const resolved = colorMap[color] || color;
            return `\\textcolor{${resolved}}`;
        });
        cleaned = cleaned.replace(/\\color\{([^}]+)\}/g, (_, color) => {
            const resolved = colorMap[color] || color;
            return `\\color{${resolved}}`;
        });
        return cleaned.trim();
    };

    // Protect Display Math
    protect(/\\\[([\s\S]*?)\\\]/g, (_, inner) => {
        const cleaned = cleanMath(inner);
        return previewMode ? `$${cleaned}$` : `\n$$\n${cleaned}\n$$\n`;
    });
    protect(/\\begin\{equation\*?\}([\s\S]*?)\\end\{equation\*?\}/g, (_, inner) => {
        const cleaned = cleanMath(inner);
        return previewMode ? `$${cleaned}$` : `\n$$\n${cleaned}\n$$\n`;
    });
    protect(/\\begin\{displaymath\*?\}([\s\S]*?)\\end\{displaymath\*?\}/g, (_, inner) => {
        const cleaned = cleanMath(inner);
        return previewMode ? `$${cleaned}$` : `\n$$\n${cleaned}\n$$\n`;
    });

    // Handle eqnarray
    protect(/\\begin\{eqnarray\*?\}([\s\S]*?)\\end\{eqnarray\*?\}/g, (_, inner) => {
        if (previewMode) return '[Equação]';
        const lines = inner.trim().split(/\\\\/).map(line => {
            return cleanMath(line).replace(/&\s*([=<>~])\s*&/g, '&$1').replace(/\\nonumber/g, '');
        }).join('\\\\\n');
        return `\n$$\n\\begin{aligned}${lines}\\end{aligned}\n$$\n`;
    });

    protect(/\\begin\{subeqnarray\*?\}([\s\S]*?)\\end\{subeqnarray\*?\}/g, (_, inner) => {
        if (previewMode) return '[Equação]';
        const lines = inner.trim().split(/\\\\/).map(line => {
            return cleanMath(line).replace(/&\s*([=<>~])\s*&/g, '&$1').replace(/\\slabel\{[^}]+\}/g, '');
        }).join('\\\\\n');
        return `\n$$\n\\begin{aligned}${lines}\\end{aligned}\n$$\n`;
    });

    protect(/\\begin\{align\*?\}([\s\S]*?)\\end\{align\*?\}/g, (_, inner) => previewMode ? '[Equação]' : `\n$$\n\\begin{aligned}${cleanMath(inner)}\\end{aligned}\n$$\n`);
    protect(/\\begin\{gather\*?\}([\s\S]*?)\\end\{gather\*?\}/g, (_, inner) => previewMode ? '[Equação]' : `\n$$\n\\begin{gathered}${cleanMath(inner)}\\end{gathered}\n$$\n`);
    protect(/\\begin\{multline\*?\}([\s\S]*?)\\end\{multline\*?\}/g, (_, inner) => previewMode ? '[Equação]' : `\n$$\n\\begin{multline}${cleanMath(inner)}\\end{multline}\n$$\n`);
    protect(/\$\$[\s\S]*?\$\$/g, (match) => cleanMath(match));

    // Protect Inline Math
    protect(/\\\(([\s\S]*?)\\\)/g, (_, inner) => `$${cleanMath(inner)}$`);
    protect(/\\begin\{math\}([\s\S]*?)\\end\{math\}/g, (_, inner) => `$${cleanMath(inner)}$`);
    protect(/\$[\s\S]*?\$/g, (match) => {
        if (match.length <= 2) return match;
        const inner = match.substring(1, match.length - 1);
        return `$${cleanMath(inner)}$`;
    });

    // 3. Reference & Citation Replacement (The "Second Pass")
    processedText = processedText.replace(/\\cite\{([^}]+)\}/g, (_, keys) => {
        const refs = keys.split(',').map((k: string) => citations[k.trim()] || '?');
        return `[${refs.join(', ')}]`;
    });
    processedText = processedText.replace(/\\ref\{([^}]+)\}/g, (_, key) => labels[key] || '??');
    processedText = processedText.replace(/\\pageref\{([^}]+)\}/g, () => 'pág. ??');

    // Remove labels from text now that they are processed
    processedText = processedText.replace(/\\label\{[^}]+\}/g, '');

    // 4. Cleaning Phase: Remove LaTeX boilerplate and layout commands (Fallback for snippets)
    processedText = processedText.replace(/\\documentstyle\s*(\[[\s\S]*?\])?\s*\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\documentclass\s*(\[[\s\S]*?\])?\s*\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\usepackage\s*(\[[\s\S]*?\])?\s*\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\includeonly\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\include\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\input\{[^}]+\}/g, '');
    // \begin{document} and \end{document} are handled in Preamble Stripping, but just in case:
    processedText = processedText.replace(/\\begin\s*\{document\}/g, '');
    processedText = processedText.replace(/\\end\s*\{document\}/g, '');

    // Remove other structural commands that we don't render
    processedText = processedText.replace(/\\bibliography\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\bibliographystyle\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\tableofcontents/g, '');
    processedText = processedText.replace(/\\listoffigures/g, '');
    processedText = processedText.replace(/\\listoftables/g, '');

    // Fancyhdr and Page Layout
    processedText = processedText.replace(/\\pagestyle\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\fancyhead\[?[^\]]*\]?\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\fancyfoot\[?[^\]]*\]?\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\renewcommand\{\\(foot|head)rulewidth\}\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\nouppercase/g, '');
    processedText = processedText.replace(/\\leftmark/g, '');
    processedText = processedText.replace(/\\rightmark/g, '');

    const layoutParams = ['textwidth', 'textheight', 'columnsep', 'columnseprule', 'oddsidemargin', 'evensidemargin', 'marginparwidth', 'topmargin', 'headheight'];
    layoutParams.forEach(p => {
        processedText = processedText.replace(new RegExp(`\\\\${p}`, 'g'), '');
        processedText = processedText.replace(new RegExp(`\\\\addtolength\\{\\\\${p}\\}\\{[^}]+\\}`, 'g'), '');
        processedText = processedText.replace(new RegExp(`\\\\setwidth\\{\\\\${p}\\}\\{[^}]+\\}`, 'g'), '');
    });

    // Custom Commands
    processedText = processedText.replace(/\\newcommand\{[^}]+\}(\[[^\]]+\])?\{[\s\S]*?\}/g, '');
    processedText = processedText.replace(/\\newenvironment\{[^}]+\}(\[[^\]]+\])?\{[\s\S]*?\}\{[\s\S]*?\}/g, '');

    // Title, Author, Date extraction (Already done in 0.2)

    processedText = processedText.replace(/\\maketitle/g, () => {
        if (previewMode) return '';
        let header = '';
        if (title) header += `# ${title}\n\n`;
        if (author) header += `**Autor(es):** ${author}\n\n`;
        if (date) header += `**Data:** ${date}\n\n`;
        return header;
    });

    processedText = processedText.replace(/\\hypersetup\{[^}]+\}/g, '');
    processedText = processedText.replace(/\\hyphenation\{[^}]+\}/g, '');

    // 5. Structure Phase: Sections and Titles
    processedText = processedText.replace(/\\part\*?\{([^}]+)\}/g, '\n# $1\n');
    processedText = processedText.replace(/\\chapter\*?\{([^}]+)\}/g, '\n# $1\n');
    processedText = processedText.replace(/\\section\*?\{([^}]+)\}/g, '\n# $1\n');
    processedText = processedText.replace(/\\subsection\*?\{([^}]+)\}/g, '\n## $1\n');
    processedText = processedText.replace(/\\subsubsection\*?\{([^}]+)\}/g, '\n### $1\n');
    processedText = processedText.replace(/\\paragraph\*?\{([^}]+)\}/g, '\n#### $1\n');
    processedText = processedText.replace(/\\subparagraph\*?\{([^}]+)\}/g, '\n##### $1\n');

    // 6. Academic Environments Phase
    const environments = [
        { name: 'theorem', label: 'Teorema', color: 'blue' },
        { name: 'proof', label: 'Demonstração', color: 'gray', italic: true },
        { name: 'definition', label: 'Definição', color: 'green' },
        { name: 'example', label: 'Exemplo', color: 'orange' },
        { name: 'remark', label: 'Observação', color: 'yellow' },
        { name: 'lemma', label: 'Lema', color: 'blue' },
        { name: 'corollary', label: 'Corolário', color: 'blue' },
        { name: 'proposition', label: 'Proposição', color: 'blue' },
        { name: 'exercise', label: 'Exercício', color: 'purple' },
        { name: 'solution', label: 'Resolução', color: 'green' },
        { name: 'abstract', label: 'Resumo', color: 'gray' },
        { name: 'quote', label: '', color: 'purple', italic: true },
        { name: 'quotation', label: '', color: 'purple', italic: true },
        { name: 'verse', label: 'Versos', color: 'pink', italic: true },
        { name: 'tabbing', label: 'Alinhamento', color: 'gray' },
        { name: 'thebibliography', label: 'Referências', color: 'gray' }
    ];

    environments.forEach(env => {
        const regex = new RegExp(`\\\\begin\\{${env.name}\\*?\\}([\\s\\S]*?)\\\\end\\{${env.name}\\*?\\}`, 'g');
        processedText = processedText.replace(regex, (_, inner) => {
            if (previewMode) return inner.substring(0, 50) + '...';
            const label = env.label ? `**${env.label}**: ` : '';
            let content = inner.trim();
            if (env.name === 'tabbing') {
                content = content.replace(/\\=/g, ' ').replace(/\\>/g, '&nbsp;&nbsp;&nbsp;&nbsp;').replace(/\\kill/g, '');
            }
            return `\n<div class="latex-env latex-env-${env.name}">\n${label}${env.italic ? '*' : ''}${content}${env.italic ? '*' : ''}\n</div>\n`;
        });
    });

    // Minipage
    processedText = processedText.replace(/\\begin\{minipage\}\[?[^\]]*\]?\{([^}]+)\}([\s\S]*?)\\end\{minipage\}/g, (_, width, inner) => {
        if (previewMode) return inner;
        return `\n<div style="display:inline-block; width:${width}; vertical-align:top; border:1px dashed #ccc; padding:10px; margin:5px;">${inner}</div>\n`;
    });

    // 7. Formatting Phase
    processedText = processedText.replace(/\\textbf\{([^}]+)\}/g, '**$1**');
    processedText = processedText.replace(/\\textit\{([^}]+)\}/g, '*$1*');
    processedText = processedText.replace(/\\emph\{([^}]+)\}/g, '*$1*');
    processedText = processedText.replace(/\\underline\{([^}]+)\}/g, '<u>$1</u>');
    processedText = processedText.replace(/\\texttt\{([^}]+)\}/g, '`$1`');
    processedText = processedText.replace(/\\textsf\{([^}]+)\}/g, '<span style="font-family: sans-serif;">$1</span>');
    processedText = processedText.replace(/\\textsl\{([^}]+)\}/g, '<span style="font-style: italic;">$1</span>');
    processedText = processedText.replace(/\\textsc\{([^}]+)\}/g, '<span style="font-variant: small-caps;">$1</span>');
    processedText = processedText.replace(/\\sout\{([^}]+)\}/g, '~~$1~~');

    // Colors & Highlights
    // Fix nested or broken textcolor
    processedText = processedText.replace(/\\textcolor\{([^}]+)\}\{([^}]+)\}/g, (_, color, text) => {
        const resolvedColor = colorMap[color] || color;
        return `<span style="color:${resolvedColor}">${text}</span>`;
    });
    processedText = processedText.replace(/\\color\{([^}]+)\}/g, (_, color) => {
        const resolvedColor = colorMap[color] || color;
        return `<span style="color:${resolvedColor}">`;
    });
    processedText = processedText.replace(/\\colorbox\{([^}]+)\}\{([^}]+)\}/g, '<span style="background-color:$1; padding:2px 4px; border-radius:4px;">$2</span>');
    processedText = processedText.replace(/\\fcolorbox\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/g, '<span style="border:1px solid $1; background-color:$2; padding:2px 4px; border-radius:4px;">$3</span>');

    // Specific highlights for "Nota:", "Atenção:", etc.
    processedText = processedText.replace(/^(Nota|Atenção|Importante|Dica):/gm, '<strong style="color:rgb(178,0,0)">$1:</strong>');

    // Boxes
    processedText = processedText.replace(/\\fbox\{([^}]+)\}/g, '<span style="border:1px solid currentColor; padding:2px 4px; border-radius:2px;">$1</span>');
    processedText = processedText.replace(/\\framebox\[([^\]]+)\]\[([^\]]+)\]\{([^}]+)\}/g, '<span style="display:inline-block; border:1px solid currentColor; width:$1; text-align:$2; padding:2px 4px;">$3</span>');
    processedText = processedText.replace(/\\makebox\[([^\]]+)\]\[([^\]]+)\]\{([^}]+)\}/g, '<span style="display:inline-block; width:$1; text-align:$2;">$3</span>');
    processedText = processedText.replace(/\\raisebox\{([^}]+)\}\{([^}]+)\}/g, '<span style="display:inline-block; vertical-align:$1;">$2</span>');

    // Size commands
    const sizes = [
        { name: 'tiny', size: '0.6em' },
        { name: 'scriptsize', size: '0.7em' },
        { name: 'footnotesize', size: '0.8em' },
        { name: 'small', size: '0.9em' },
        { name: 'normalsize', size: '1em' },
        { name: 'large', size: '1.2em' },
        { name: 'Large', size: '1.4em' },
        { name: 'LARGE', size: '1.6em' },
        { name: 'huge', size: '2em' },
        { name: 'Huge', size: '2.5em' }
    ];

    sizes.forEach(size => {
        const regexBrace = new RegExp(`\\\\{\\\\${size.name}\\s+([^}]+)\\\\}`, 'g');
        processedText = processedText.replace(regexBrace, `<span style="font-size: ${size.size};">$1</span>`);
        const regexArg = new RegExp(`\\\\${size.name}\\{([^}]+)\\}`, 'g');
        processedText = processedText.replace(regexArg, `<span style="font-size: ${size.size};">$1</span>`);
    });

    // 8. Lists Phase
    processedText = processedText.replace(/\\begin\{description\}/g, '\n');
    processedText = processedText.replace(/\\end\{description\}/g, '\n');
    processedText = processedText.replace(/\\item\[([^\]]+)\]/g, '\n* **$1**: ');

    processedText = processedText.replace(/\\begin\{itemize\}/g, '\n');
    processedText = processedText.replace(/\\end\{itemize\}/g, '\n');
    processedText = processedText.replace(/\\begin\{enumerate\}/g, '\n');
    processedText = processedText.replace(/\\end\{enumerate\}/g, '\n');
    processedText = processedText.replace(/\\item/g, '\n* ');

    // 9. Miscellaneous Phase
    processedText = processedText.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, '\n<div style="text-align: center;">$1</div>\n');
    processedText = processedText.replace(/\\begin\{flushleft\}([\s\S]*?)\\end\{flushleft\}/g, '\n<div style="text-align: left;">$1</div>\n');
    processedText = processedText.replace(/\\begin\{flushright\}([\s\S]*?)\\end\{flushright\}/g, '\n<div style="text-align: right;">$1</div>\n');

    processedText = processedText.replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, '[$2]($1)');
    processedText = processedText.replace(/\\url\{([^}]+)\}/g, '[$1]($1)');
    processedText = processedText.replace(/\\footnote\{([^}]+)\}/g, ' ($1)');

    // Spacing and Lines
    processedText = processedText.replace(/\\hspace\{([^}]+)\}/g, '<span style="display:inline-block; width:$1;"></span>');
    processedText = processedText.replace(/\\vspace\{([^}]+)\}/g, '<div style="height:$1;"></div>');
    processedText = processedText.replace(/\\\\\[([^\]]+)\]/g, '<div style="height:$1;"></div>'); // Handle \\[0.3cm]
    processedText = processedText.replace(/\\hrule/g, '<hr style="border:none; border-top:1px solid currentColor; margin:1em 0;">');
    processedText = processedText.replace(/\\hrulefill/g, '<hr style="display:inline-block; width:100%; border:none; border-top:1px solid currentColor; margin:0; vertical-align:middle">');
    processedText = processedText.replace(/\\dotfill/g, '<span style="display:inline-block; width:100%; border-bottom:1px dotted currentColor; margin-bottom:0.2em"></span>');
    processedText = processedText.replace(/\\rule\[([^\]]+)\]\{([^}]+)\}\{([^}]+)\}/g, '<div style="display:inline-block; width:$2; height:$3; background:currentColor; vertical-align:$1;"></div>');
    processedText = processedText.replace(/\\rule\{([^}]+)\}\{([^}]+)\}/g, '<div style="display:inline-block; width:$1; height:$2; background:currentColor;"></div>');
    processedText = processedText.replace(/\\hfill/g, '<span style="flex-grow:1"></span>');
    processedText = processedText.replace(/\\vfill/g, '<div style="flex-grow:1"></div>');

    // Symbols & Accents
    processedText = processedText.replace(/\\c\{o\}/g, 'ç');
    processedText = processedText.replace(/\\S/g, '§');
    processedText = processedText.replace(/\\copyright/g, '©');
    processedText = processedText.replace(/\\c\{c\}/g, 'ç');
    processedText = processedText.replace(/\\c\{C\}/g, 'Ç');
    processedText = processedText.replace(/\\\'\{e\}/g, 'é');
    processedText = processedText.replace(/\\\'\{E\}/g, 'É');
    processedText = processedText.replace(/\\\'\{a\}/g, 'á');
    processedText = processedText.replace(/\\\'\{A\}/g, 'Á');
    processedText = processedText.replace(/\\\'\{i\}/g, 'í');
    processedText = processedText.replace(/\\\'\{I\}/g, 'Í');
    processedText = processedText.replace(/\\\'\{o\}/g, 'ó');
    processedText = processedText.replace(/\\\'\{O\}/g, 'Ó');
    processedText = processedText.replace(/\\\'\{u\}/g, 'ú');
    processedText = processedText.replace(/\\\'\{U\}/g, 'Ú');

    // Dashes & Special characters
    processedText = processedText.replace(/---/g, '&mdash;');
    processedText = processedText.replace(/--/g, '&ndash;');
    processedText = processedText.replace(/\\%/g, '%');
    processedText = processedText.replace(/\\&/g, '&');
    processedText = processedText.replace(/\\\$/g, '$');
    processedText = processedText.replace(/\\#/g, '#');
    processedText = processedText.replace(/\\_/g, '_');
    processedText = processedText.replace(/\\\{/g, '{');
    processedText = processedText.replace(/\\\}/g, '}');

    // Spacing
    processedText = processedText.replace(/\\indent/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
    processedText = processedText.replace(/\\noindent/g, '');
    processedText = processedText.replace(/\\par/g, '\n\n');
    processedText = processedText.replace(/\\mbox\{([^}]+)\}/g, '$1');

    // Handle LaTeX line breaks
    processedText = processedText.replace(/\\\\/g, '\n\n');
    processedText = processedText.replace(/\\linebreak/g, '\n\n');
    processedText = processedText.replace(/\\newpage/g, '\n\n---\n\n');
    processedText = processedText.replace(/\\pagebreak/g, '\n\n---\n\n');

    // 10. Restoration Phase: Bring back math and verbatim
    mathBlocks.forEach((block, i) => {
        processedText = processedText.replace(`@@BLOCK${i}@@`, block);
    });

    // 11. Final Polish: Clean up whitespace
    processedText = processedText.replace(/\n{3,}/g, '\n\n');

    return processedText.trim();
};

export const LatexRenderer: React.FC<LatexRendererProps> = ({ content, className = '', previewMode = false }) => {
    const processedContent = useMemo(() => preprocessLatex(content, previewMode), [content, previewMode]);

    return (
        <div className={`latex-renderer academic-style ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
                components={{
                    h1: ({ children }) => <h1 className="text-3xl font-extrabold mt-12 mb-8 border-b-4 border-brand-purple/10 pb-4 text-brand-dark dark:text-white tracking-tight leading-tight">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-2xl font-bold mt-10 mb-6 text-brand-dark dark:text-white flex items-center gap-3">
                        <span className="w-2 h-8 bg-brand-purple rounded-full shadow-sm"></span>
                        {children}
                    </h2>,
                    h3: ({ children }) => <h3 className="text-xl font-bold mt-8 mb-4 text-brand-dark dark:text-white border-l-4 border-brand-purple/20 pl-4">{children}</h3>,
                    p: ({ children }) => <div className="mb-6 leading-relaxed text-justify text-[16px] text-gray-800 dark:text-gray-200">{children}</div>,
                    ul: ({ children }) => <ul className="list-disc ml-10 mb-8 space-y-3">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal ml-10 mb-8 space-y-3">{children}</ol>,
                    li: ({ children }) => <li className="pl-2">{children}</li>,
                    blockquote: ({ children }) => <blockquote className="border-l-8 border-brand-purple/20 bg-brand-purple/5 pl-8 py-6 italic my-8 text-gray-700 dark:text-gray-300 rounded-r-2xl shadow-inner">{children}</blockquote>,
                    div: ({ className, children, ...props }) => {
                        if (className?.includes('latex-env')) {
                            return <div className={`${className} p-6 my-8 rounded-3xl border-l-[6px] shadow-neu bg-white dark:bg-gray-800 transition-all hover:shadow-lg`} {...props}>{children}</div>;
                        }
                        return <div className={className} {...props}>{children}</div>;
                    },
                    pre: ({ children }) => <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl overflow-x-auto my-6 border border-gray-200 dark:border-gray-700 font-mono text-sm">{children}</pre>,
                    code: ({ children }) => <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono text-sm text-brand-purple">{children}</code>
                }}
            >
                {processedContent}
            </ReactMarkdown>

            <style>{`
        .latex-env-theorem { border-left-color: #3B82F6; }
        .latex-env-proof { border-left-color: #9CA3AF; }
        .latex-env-definition { border-left-color: #10B981; }
        .latex-env-example { border-left-color: #F59E0B; }
        .latex-env-remark { border-left-color: #EAB308; }
        .latex-env-exercise { border-left-color: #8B5CF6; }
        .latex-env-solution { border-left-color: #059669; }
        .latex-env-lemma { border-left-color: #60A5FA; }
        .latex-env-corollary { border-left-color: #93C5FD; }
        .latex-env-proposition { border-left-color: #2563EB; }
        .latex-env-abstract { border-left-color: #6B7280; font-size: 0.95em; }
        .latex-env-quote, .latex-env-quotation { border-left-color: #D1D5DB; background-color: rgba(0,0,0,0.02); }
        .latex-env-verse { border-left-color: #F472B6; white-space: pre-wrap; font-style: italic; }
        .latex-env-tabbing { border-left-color: #9CA3AF; font-family: monospace; white-space: pre-wrap; }
        .latex-env-thebibliography { border-left-color: #6B7280; }
        
        .latex-renderer .katex-display {
          background: rgba(255, 255, 255, 0.8);
          padding: 2rem;
          border-radius: 1.5rem;
          margin: 2rem 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(0,0,0,0.05);
          overflow-x: auto;
          overflow-y: hidden;
        }
        .dark .latex-renderer .katex-display {
          background: rgba(31, 41, 55, 0.5);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        
        .latex-renderer .katex {
          font-size: 1.15em;
        }
        
        .academic-style {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          color: #1F2937;
        }
        
        .dark .academic-style {
          color: #F3F4F6;
        }
      `}</style>
        </div>
    );
};
