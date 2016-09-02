#!/usr/bin/env node --harmony
var program = require('commander');
var eb = require('../lib/enigma');

var main = function(params, program){
    if (program.processData){
        //console.log("ProcessData");
        var cfg = JSON.parse(params);
        

        var p = new eb.client.processData(cfg);
        p.call().then(function(res){
            console.log(eb.misc.inputToHex(res.data));

        }).catch(function(err){
            console.log("Error");
            console.log(err);
        });

    } else if (program.createUo){
        //console.log("CreateUO")
        var cfg = JSON.parse(params);


        var p = new eb.client.createUO(cfg);
        p.call().then(function(res){
            console.log(data.result.handle);

        }).catch(function(err){
            console.log("Error");
            console.log(err);
        });

    } else {
        console.log("No option chosen");
    }
};

// Arguments
program
    .version("0.0.1")
    .arguments('<file>')
    .option('-p, --process-data', 'Call processData()')
    .option('-c, --create-uo', 'Crete new UO')
    .option('-r, --result', 'Returns result only')
    .action(function(file) {
        main(file, program);
      })
    .parse(process.argv);


