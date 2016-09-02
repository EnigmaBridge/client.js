"use strict";
var expect = require("chai").expect;
var eb = require("../lib/enigma");

var settings = {
    host: "https://site2.enigmabridge.com:11180",
    requestMethod: "POST",
    requestTimeout: 7000,
    debuggingLog: false,
    apiKey: "TEST_API",
    retry: {
        maxAttempts: 3
    }
};

describe("Client", function() {
    // Retry all tests in this suite up to 5 times
    this.retries(3);

    it("processData", function (done) {
        this.timeout(15000);
        var input = '6bc1bee22e409f96e93d7e117393172a';
        var cfg = eb.misc.extend(true, {}, settings, {
            uoId: 'EE01',
            uoType: '4',
            aesKey: 'e134567890123456789012345678901234567890123456789012345678901234',
            macKey: 'e224262820223456789012345678901234567890123456789012345678901234'
        });

        var cl = new eb.client.processData(cfg);
        var promise = cl.call(input);

        promise.then(function(data){
            expect(eb.misc.inputToHex(data.data)).to.equal('95c6bb9b6a1c3835f98cc56087a03e82');
            done();
        }).catch(function(e) {
            done(e);
        });
    });

});

