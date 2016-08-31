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


