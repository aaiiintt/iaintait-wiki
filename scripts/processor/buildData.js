const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { globSync } = require('glob');

const REPO_ROOT = path.resolve(__dirname, '../../');
const APP_PUBLIC_DIR = path.join(REPO_ROOT, 'app/public');

// Ensure public directory exists
if (!fs.existsSync(APP_PUBLIC_DIR)) {
  fs.mkdirSync(APP_PUBLIC_DIR, { recursive: true });
}

function processDirectory(dirName, type) {
  const dirPath = path.join(REPO_ROOT, dirName);
  const files = globSync(`${dirPath}/**/*.md`);
  
  return files.map(file => {
    const rawContent = fs.readFileSync(file, 'utf8');
    const parsed = matter(rawContent);
    const slug = path.basename(file, '.md');
    
    return {
      id: slug,
      type: type,
      title: parsed.data.title || slug,
      metadata: { ...parsed.data },
      body: parsed.content
    };
  });
}

function build() {
  console.log('Building matrix.json data...');
  
  const projects = processDirectory('projects', 'project');
  const collaborators = processDirectory('collaborators', 'collaborator');
  const agencies = processDirectory('agencies', 'agency');
  
  const allData = [...projects, ...collaborators, ...agencies];
  
  const outputPath = path.join(APP_PUBLIC_DIR, 'matrix.json');
  fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2));
  
  console.log(`Successfully built ${allData.length} records into ${outputPath}`);
}

build();
