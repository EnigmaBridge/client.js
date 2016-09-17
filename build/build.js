#! /usr/bin/env node
var shell = require("shelljs");
var fs = require('fs');

// Build SJCL with required modules
shell.exec("cd ./node_modules/sjcl/ && ./configure " +
    "--with-codecBase32 " +
    "--with-bn " +
    "--with-codecBase32 " +
    "--with-codecBytes " +
    "--with-sha1");

// Make sure SJCL's compress directory exists
if (!fileExists('./node_modules/sjcl/compress/compress_with_closure.sh')){
    shell.exec("mkdir -p ./node_modules/sjcl/compress " +
        " && cp -a build/sjcl_compress/* ./node_modules/sjcl/compress/ " +
        " && echo Compress copied");
}

// Make & Backup specially modified SJCL to the lib
shell.exec("cd ./node_modules/sjcl/ && make " +
    "&& cp core.js ../../lib/built/sjcl/sjcl.max.js" +
    "&& cp sjcl.js ../../lib/built/sjcl/sjcl.js");

// Browserify.
shell.exec("mkdir -p dist/ && ./node_modules/.bin/browserify --exclude crypto --standalone eb " +
    "lib/enigma.js > dist/enigma.js");

// Browserify + minify
shell.exec("./node_modules/.bin/browserify --exclude crypto --standalone eb lib/enigma.js " +
    "-d -p [minifyify --map dist/enigma.js.map --output dist/enigma.js.map] > dist/enigma.min.js");


function fileExists(filePath) {
    try {
        return fs.statSync(filePath).isFile();
    } catch (err) {
        return false;
    }
}
