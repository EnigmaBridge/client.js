#! /usr/bin/env node
var shell = require("shelljs");

// Build SJCL with required modules
shell.exec("cd ./node_modules/sjcl/ && ./configure " +
    "--with-codecBase32 " +
    "--with-bn " +
    "--with-codecBase32 " +
    "--with-codecBytes " +
    "--with-sha1");

shell.exec("cd ./node_modules/sjcl/ && make");

// Browserify.
shell.exec("./node_modules/.bin/browserify --no-builtins --standalone eb lib/enigma.js > dist/enigma.js");

// Browserify + minify
shell.exec("browserify lib/enigma.js --no-builtins --standalone eb " +
    "-d -p [minifyify --map dist/enigma.js.map --output dist/enigma.js.map] > dist/enigma.min.js");

