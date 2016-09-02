#! /usr/bin/env node
var shell = require("shelljs");

// Build SJCL with required modules
shell.exec("cd ./node_modules/sjcl/ && ./configure " +
    "--with-codecBase32 " +
    "--with-bn " +
    "--with-codecBase32 " +
    "--with-codecBytes " +
    "--with-sha1");

// Make & Backup specially modified SJCL to the lib
shell.exec("cd ./node_modules/sjcl/ && make " +
    "&& cp core.js ../../lib/built/sjcl/sjcl.max.js" +
    "&& cp sjcl.js ../../lib/built/sjcl/sjcl.js");

// Browserify.
shell.exec("./node_modules/.bin/browserify --exclude crypto --standalone eb " +
    "lib/enigma.js > dist/enigma.js");

// Browserify + minify
shell.exec("./node_modules/.bin/browserify --exclude crypto --standalone eb lib/enigma.js " +
    "-d -p [minifyify --map dist/enigma.js.map --output dist/enigma.js.map] > dist/enigma.min.js");

