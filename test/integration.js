var expect    = require("chai").expect;
var should    = require("chai").should;
var eb        = require("../lib/enigma");

var endpoint = "site2.enigmabridge.com";
var settings = {
    remoteEndpoint: endpoint,
    remotePort: 11180,
    requestMethod: "POST",
    requestScheme: "https",
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

function checkProcessDataResponse(done, expected){
    return function(data){
        expect(data).to.have.property('protectedData');
        expect(data.protectedData).to.be.a('array');
        expect(eb.misc.inputToHex(data.protectedData)).to.equal(expected);
        done();
    }
}

function processFail(done){
    return function(a, b){
        done(a);
    }
}

// For more info:
// https://mochajs.org/
describe("Functional tests", function() {
    describe("ProcessData", function(){
        // Retry all tests in this suite up to 5 times
        this.retries(5);

        it("plainaes", function(done){
            var input = '6bc1bee22e409f96e93d7e117393172a';
            var cfg = {
                userObjectId:    'EE01',
                callRequestType: 'PLAINAES',
                aesKey: 'e134567890123456789012345678901234567890123456789012345678901234',
                macKey: 'e224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(done, '95c6bb9b6a1c3835f98cc56087a03e82'),
                processFail(done)
            );
        });

        it("plainaesdecrypt", function(done){
            var input = '95c6bb9b6a1c3835f98cc56087a03e82';
            var cfg = {
                userObjectId:    'EE02',
                callRequestType: 'PLAINAESDECRYPT',
                aesKey: 'e134567890123456789012345678901234567890123456789012345678901234',
                macKey: 'e224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(done, '6bc1bee22e409f96e93d7e117393172a'),
                processFail(done)
            );
        });

        it("rsa1024-test", function(done){
            var input = '1122334455667788112233445566778811223344556677881122334455667788112233445566778811223344556677881122334455667788112233445566778811223344556677881122334455667788112233445566778811223344556677881122334455667788112233445566778811223344556677881122334455667788';
            var cfg = {
                userObjectId:    '7654',
                aesKey: '1234567890123456789012345678901234567890123456789012345678901234',
                macKey: '2224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(done, '683f4c45dc659d0df54b5eb15a058bb69169d7e7c06a5e28f3042f398fb84537ee48530a5873d9749e5accb756da5b246c35f3c4fd47bca7c27d2e3c3737330f11fce4302f1afd81ee1c37de6bc25b6e48fa5c228bce29c09c8cb49432d2d2807a09d189ee5df515c271bc9093f7a852d7aa00baa957c3cd9409452b4a4964c5'),
                processFail(done)
            );
        });

        it("rsa1024-one", function(done){
            var input = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
            var cfg = {
                userObjectId:    '7654',
                aesKey: '1234567890123456789012345678901234567890123456789012345678901234',
                macKey: '2224262820223456789012345678901234567890123456789012345678901234'};

            simpleProcessData(
                cfg,
                eb.misc.inputToBits(input),
                checkProcessDataResponse(done, '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001'),
                processFail(done)
            );
        });
    });
});