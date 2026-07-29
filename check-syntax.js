const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
    const html = fs.readFileSync(filePath, 'utf8');
    const scriptMatches = html.match(/<script>([\s\S]*?)<\/script>/g);
    if (!scriptMatches) {
        console.log(`${filePath}: no inline scripts found`);
        return;
    }

    let index = 0;
    scriptMatches.forEach(match => {
        const code = match.replace(/<script>/, '').replace(/<\/script>/, '');
        index++;
        try {
            new Function(code);
            console.log(`✅ ${filePath} script #${index}: syntax OK`);
        } catch (err) {
            console.error(`❌ ${filePath} script #${index}: ${err.message}`);
            process.exitCode = 1;
        }
    });
}

[
    'nebula-chronicle.html',
    'watch.html',
    'index.html'
].forEach(file => checkFile(path.join(__dirname, file)));

console.log('\nAlso checking shared JS files:');
['js/shared-data.js', 'js/shared-utils.js'].forEach(file => {
    const fullPath = path.join(__dirname, file);
    try {
        const code = fs.readFileSync(fullPath, 'utf8');
        new Function(code);
        console.log(`✅ ${file}: syntax OK`);
    } catch (err) {
        console.error(`❌ ${file}: ${err.message}`);
        process.exitCode = 1;
    }
});
