const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

code = code.replace(/<\s+button/g, '<button');
code = code.replace(/<\s*\/button\s*>/g, '</button>');
code = code.replace(/data\s*-\s*action/g, 'data-action');
code = code.replace(/data\s*-\s*id/g, 'data-id');
code = code.replace(/data\s*-\s*index/g, 'data-index');
code = code.replace(/data\s*-\s*tab/g, 'data-tab');
code = code.replace(/<\s+span/g, '<span');
code = code.replace(/<\s*\/span\s*>/g, '</span>');
code = code.replace(/<\s+div/g, '<div');
code = code.replace(/<\s*\/div\s*>/g, '</div>');
code = code.replace(/<\s+section/g, '<section');
code = code.replace(/<\s*\/section\s*>/g, '</section>');
code = code.replace(/<\s+img/g, '<img');

// Also fix some styles that got spaced out
code = code.replace(/style\s*=\s*"/g, 'style="');
code = code.replace(/class=\s*"/g, 'class="');
code = code.replace(/class=\s*([\w-]+)/g, 'class="$1"'); // If quotes were lost, wait let's just stick to what we know

// The formatter did: < button class= "album-card" ...
code = code.replace(/class=\s*"/g, 'class="');

fs.writeFileSync('app.js', code);
console.log("Fixed HTML tags in app.js");
