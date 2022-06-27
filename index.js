const lines = test.split(/\r?\n|$/).map((line) => {
  const commentIndex = line.search(/ *\/\//g);
  if (commentIndex !== -1) {
    return line.substr(0, commentIndex);
  }
  return line;
});
console.log(lines);

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
