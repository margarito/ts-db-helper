const path = require('path');
const fs = require('fs');
const package = require(path.join(__dirname, 'package.json'));
const distPackage = {};

const fieldsToCopy = ['name', 'version', 'license', 'description', 'author', 'keywords', 'repository', 'homepage', 'bugs'];

distPackage.main = 'bundles/ts-db-helper.umd.js';
distPackage.module = 'index.js';
distPackage.typings = 'index.d.ts';

for (const field of fieldsToCopy) {
    distPackage[field] = package[field];
}

distPackage.dependencies = {
    'rxjs': '^5.1.0'
};

fs.writeFile(path.join(__dirname, 'dist', 'package.json'), JSON.stringify(distPackage, null, 4), (err) => {
    if (err) throw err;
    console.log('>>>> dist package.jon generated.');
});