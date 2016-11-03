"use strict";
var expect = require("chai").expect;
var eb = require("../lib/enigma");

var settings = {
    host: "https://site2.enigmabridge.com:11180",
    requestMethod: "POST",
    requestTimeout: 7000,
    debuggingLog: false,
    apiKey: "TEST_API"
};

/**
 * Simple process data wrapper.
 * @param config
 * @param input
 * @param onDone
 * @param onFail
 * @param onAlways
 */
function simpleProcessData(config, input, onDone, onFail, onAlways){
    onAlways = onAlways || function(){};
    var request = new eb.comm.processData();
    request.configure(config);
    request.configure(settings);
    request.done(function(response, requestObj, data) {
        onDone(response);

    }).fail(function(failType, data){
        onFail(failType, data);

    }).always(function(request, data){
        onAlways(request, data);

    });
    request.build([], input);
    request.doRequest();
}

function checkProcessDataResponse(self, done, expected){
    return function(data){
        expect(data).to.have.property('protectedData');
        expect(data.protectedData).to.be.a('array');
        expect(eb.misc.inputToHex(data.protectedData)).to.equal(expected);
        done();
    }
}

function processFail(self, done){
    return function(a, b){
        if (a == 2 && b !== undefined && b.response !== undefined){
            var status = b.response.statusCode;
            // Return success on backend fails.
            if (status === 0xa0d2){ // no credits for UO left.
                self.skip();
                return;
            }
        }

        done(a);
    }
}

// For more info:
// https://mochajs.org/
describe("Functional tests", function() {
    describe("ProcessData", function(){
        // Retry all tests in this suite up to X times
        this.retries(6);
        this.timeout(7000);

        it("plainaes", function(done){
            var input = '6bc1bee22e409f96e93d7e117393172a';
            var cfg = {
                uoId:    'EE01',
                uoType:  '4',
                aesKey: 'e134567890123456789012345678901234567890123456789012345678901234',
                macKey: 'e224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(this, done, '95c6bb9b6a1c3835f98cc56087a03e82'),
                processFail(this, done)
            );
        });

        it("plainaesdecrypt", function(done){
            var input = '95c6bb9b6a1c3835f98cc56087a03e82';
            var cfg = {
                uoId:    'EE02',
                aesKey: 'e134567890123456789012345678901234567890123456789012345678901234',
                macKey: 'e224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(this, done, '6bc1bee22e409f96e93d7e117393172a'),
                processFail(this, done)
            );
        });

        it("rsa1024-zero", function(done){
            var input = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
            var cfg = {
                uoId:    '7654',
                aesKey: '1234567890123456789012345678901234567890123456789012345678901234',
                macKey: '2224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(this, done, '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'),
                processFail(this, done)
            );
        });

        it("rsa1024-one", function(done){
            var input = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
            var cfg = {
                uoId:    '7654',
                aesKey: '1234567890123456789012345678901234567890123456789012345678901234',
                macKey: '2224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(this, done, '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001'),
                processFail(this, done)
            );
        });

        it("rsa1024-two", function(done){
            var input = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002';
            var cfg = {
                uoId:    '7654',
                aesKey: '1234567890123456789012345678901234567890123456789012345678901234',
                macKey: '2224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),

                function(data){
                    expect(data).to.have.property('protectedData');
                    expect(data.protectedData).to.be.a('array');
                    expect(eb.misc.inputToHex(data.protectedData)).not.to.equal('0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002');
                    done();
                },
                
                processFail(this, done)
            );
        });
    });
});