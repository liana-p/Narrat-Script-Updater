import fs from "fs/promises";
import path from "path";

function findLines(content) {
  return content.split(/\r?\n|$/);
}

function generateReplacer(regexFunc, size, matcher) {
  return (line) => {
    const reg = regexFunc();
    const pos = line.search(reg);
    const match = reg.exec(line);
    let result = line;
    if (pos !== -1) {
      result = line.substr(0, pos);
      if (match && (match.length == size || size === -1)) {
        const matcherRes = matcher(match);
        if (matcherRes) {
          return (result += matcher(match));
        }
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
  () => /\$if (?:this\.)*([\w\.]*) *([><=]*) *(?:this\.)*([\w\.]*)/gm,
  -1,
  (match) => {
    if (match.length < 1) {
      return false;
    }
    let firstArg = match[1];
    let operand = match[2];
    if (operand === "===") {
      operand = "==";
    }
    if (usesVariable(firstArg)) {
      firstArg = `$${firstArg}`;
    }
    if (!match[3]) {
      return `if ${firstArg}:`;
    }
    let lastArg = match[3];
    if (usesVariable(lastArg)) {
      lastArg = `$${lastArg}`;
    }
    return `if (${operand} ${firstArg} ${lastArg}):`;
  }
);

function usesVariable(match) {
  const keywords = ["quests", "items", "data", "stats"];
  for (const keyword of keywords) {
    if (match.search(keyword) !== -1) {
      return true;
    }
  }
  return false;
}
async function getAllFiles(dirPath, arrayOfFiles) {
  console.log(`Finding all files in scripts folder...`);

  const files = await fs.readdir(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  for (const file of files) {
    console.log(file);
    const filePath = path.join(dirPath, file);
    console.log(filePath);
    const stats = await fs.stat(filePath);
    if (stats.isDirectory()) {
      await getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  }
  console.log(`Found ${arrayOfFiles.length} files.`);
  return arrayOfFiles;
}

async function runAllScripts() {
  console.log(`Narrat script updater for 1.x to 2.x`);
  const dirPath = path.join(path.resolve(), "scripts");
  const files = await getAllFiles(dirPath);
  console.log(` files found `, files);
  for (const [index, file] of files.entries()) {
    console.log(`Processing file ${index + 1}/${files.length}: ${file}`);
    const content = await fs.readFile(file, "utf8");
    const lines = findLines(content);
    let resultLines = [];
    for (const line of lines) {
      let res = line;
      res = replaceRoll(res);
      res = simpleCondition(res);
      resultLines.push(res);
    }
    const result = resultLines.join("\n");
    console.log(`Writing file ${index + 1}/${files.length}: ${file}`);
    await fs.writeFile(file, result, "utf8");
  }
}

const testLine = `"let's make choices cause I like making choices!" $if this.data.likeChoices: // A choice can have a condition so it only appears in the list if the condition is met`;
// console.log(simpleCondition(testLine));
runAllScripts();
