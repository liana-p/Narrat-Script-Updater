import fs from "fs/promises";
import path from "path";

function findLines(content) {
  return content.split(/\r?\n|$/);
}

function generateReplacer(regexFunc, size, matcher) {
  return (line) => {
    const reg = regexFunc();
    const pos = line.search(reg);
    let result = line;
    if (pos !== -1) {
      result = line.substr(0, pos);
      const match = reg.exec(line);
      if (match && match.length == size) {
        return (result += matcher(match));
      }
    }
    return result;
  };
}
const replaceRoll = generateReplacer(
  () => /\$if this\.roll\("(\w*)", "(\w*)", (\d*)/g,
  4,
  (match) => `if (roll ${match[1]} ${match[2]} ${match[3]}):`
);
const simpleCondition = generateReplacer(
  () => /\$if this\.([\w\.]*) *([><=]*) *(\w*)/gm,
  4,
  (match) => `if (${match[2]} ${match[1]} ${match[3]}):`
);

async function getAllFiles(dirPath, arrayOfFiles) {
  console.log(`Finding all files in scripts folder...`);

  const files = await fs.readdir(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  }
  console.log(`Found ${arrayOfFiles.length} files.`);
  return files;
}

async function runAllScripts() {
  console.log(`Narrat script updater for 1.x to 2.x`);
  const dirPath = path.join(path.resolve(), "scripts");
  const files = await getAllFiles(dirPath);
  for (const [index, file] of files.entries()) {
    console.log(`Processing file ${index + 1}/${files.length}: ${file}`);
    const content = await fs.readFile(file, "utf8");
    const lines = findLines(content);
    lines = replaceRoll(lines);
    lines = simpleCondition(lines);
    const result = lines.join("\n");
    await fs.writeFile(file, result, "utf8");
  }
}

runAllScripts();
