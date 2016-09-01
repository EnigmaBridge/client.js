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

    // Build the request so we can display request in the form.
    request.build([], input);
    request.doRequest();
}

// For more info:
// https://mochajs.org/
describe("Functional tests", function() {
    describe("ProcessData", function(){
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
                function(data){
                    expect(data).to.have.property('protectedData');
                    expect(data.protectedData).to.be.a('array');
                    expect(eb.misc.inputToHex(data.protectedData)).to.equal("95c6bb9b6a1c3835f98cc56087a03e82");
                    done();
                }, function(a,b){
                    done(a);
                }
            );
        });
    });
});