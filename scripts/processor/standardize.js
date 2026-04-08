const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { globSync } = require('glob');

const WORKSPACE_DIR = process.argv[2] === '--run' ? path.resolve(__dirname, '../../') : path.resolve(__dirname, '../../');
const IS_DRY_RUN = process.argv[2] !== '--run';

if (IS_DRY_RUN) {
    console.log("--- DRY RUN MODE: No files will be modified. Run with --run to execute. ---");
}

const foldersToProcess = ['projects', 'collaborators', 'agencies'];

let filesModified = 0;

// Helper to extract a slug from a markdown link if present, or just trim the string
function cleanValue(str) {
    if (!str) return '';
    // Match markdown links [Text](url)
    const linkMatch = str.match(/\[.*?\]\((.*?)\)/);
    if (linkMatch && linkMatch[1]) {
        // extract the basename without extension as a slug
        let url = linkMatch[1];
        let filename = path.basename(url, '.md');
        return filename.trim();
    }
    return str.replace(/\[\/?.*?\]/g, '').trim(); // Remove brackets just in case
}

// Regex to capture line matching "**Key:** Value"
function extractMetadata(content, keyMap) {
    const lines = content.split('\n');
    const newLines = [];
    const extractedData = {};

    for (let line of lines) {
        // Match format like "**Agency:** [POKE London]..." or "**Year:** 2008" or "* **Agency:**"
        const match = line.match(/^[\*\-\s]*\*\*(.*?):\*\*(.*)$/);
        
        if (match) {
            const rawKey = match[1].trim();
            const rawVal = match[2].trim();
            let mappedKey = null;

            // Map common keys to standard schema
            for (const [normKey, aliases] of Object.entries(keyMap)) {
                if (aliases.includes(rawKey.toLowerCase())) {
                    mappedKey = normKey;
                    break;
                }
            }

            if (mappedKey) {
                // Parse specific fields
                let finalVal = rawVal;
                
                if (['agency', 'client', 'associated_companies'].includes(mappedKey)) {
                     finalVal = cleanValue(rawVal);
                } 
                else if (mappedKey === 'year') {
                     // Try to match the first 4 digits
                     const yrMatch = rawVal.match(/(\d{4})/);
                     if (yrMatch) finalVal = parseInt(yrMatch[1], 10);
                }

                extractedData[mappedKey] = finalVal;
                // DO NOT add this line to newLines (we effectively remove it from body)
                continue;
            }
        }
        
        newLines.push(line);
    }

    return {
        cleanedContent: newLines.join('\n').replace(/^\s*[\r\n]/gm, '\n'), // remove extra blank lines left over
        extractedData
    };
}

const keyMappings = {
    'agency': ['agency', 'agencies'],
    'client': ['client', 'brand'],
    'year': ['year', 'date'],
    'primary_role': ['role', "iain's role", 'current role'],
    'associated_companies': ['agencies/companies', 'company']
};

foldersToProcess.forEach(folder => {
    const pattern = path.join(WORKSPACE_DIR, folder, '**/*.md');
    const files = globSync(pattern);

    files.forEach(file => {
        try {
            const fileContent = fs.readFileSync(file, 'utf8');
            const parsed = matter(fileContent);

            const { cleanedContent, extractedData } = extractMetadata(parsed.content, keyMappings);

            if (Object.keys(extractedData).length > 0) {
                console.log(`\n📄 ${path.relative(WORKSPACE_DIR, file)}`);
                console.log(`   Extracted:`, extractedData);

                if (!IS_DRY_RUN) {
                    // Update frontmatter
                    parsed.data = { ...parsed.data, ...extractedData };
                    
                    // Rebuild the file
                    const newFileContent = matter.stringify(cleanedContent, parsed.data);
                    fs.writeFileSync(file, newFileContent, 'utf8');
                    filesModified++;
                }
            }
        } catch (err) {
            console.error(`Error processing ${file}:`, err.message);
        }
    });
});

if (IS_DRY_RUN) {
    console.log(`\n--- Dry Run Complete. Found data in ${filesModified} files. ---`);
    console.log(`To apply these changes, run the script with --run`);
} else {
    console.log(`\n--- Execution Complete. Modified ${filesModified} files. ---`);
}
