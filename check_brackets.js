
const fs = require('fs');
const content = fs.readFileSync('App.tsx', 'utf8');
let balance = 0;
let line = 1;
for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') balance++;
    if (content[i] === '}') balance--;
    if (content[i] === '\n') line++;
    if (balance < 0) {
        console.log(`Balance went negative at line ${line}`);
        process.exit(1);
    }
}
console.log(`Final balance: ${balance}`);
