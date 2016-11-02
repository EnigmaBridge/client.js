"use strict";
var expect = require("chai").expect;
var eb = require("../lib/enigma");
var sjcl = eb.misc.sjcl;

var config = new eb.client.Configuration({
    endpointProcess: 'https://site2.enigmabridge.com:11180',
    endpointEnroll: 'https://site2.enigmabridge.com:11182',
    timeout: 30000,
    apiKey: 'TEST_API',
    retry: {
        maxAttempts: 2
    }
});

var settings = {
    debuggingLog: false,
    config: config
};

// Ignore server-side faults - like no auth credits on test objects
function processFail(self, done){
    return function(ex){
        if (ex && ex.data && ex.data.response && ex.data.response.statusCode){
            var status = ex.data.response.statusCode;
            if (status === 0xa0d2){ // no credits for UO left.
                self.skip();
                return;
            }
        }

        done(ex);
    }
}

describe("Client", function() {
    // Retry all tests in this suite up to 5 times
    this.retries(3);
    this.timeout(150000);

    it("processData", function (done) {
        var input = '6bc1bee22e409f96e93d7e117393172a';
        var cfg = eb.misc.extend(true, settings, {
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
        }).catch(processFail(this, done));
    });

    it("createUO", function(done){
        var cfg = eb.misc.extend(true, {}, settings, {
            tpl: {
                "type": eb.comm.createUO.consts.uoType.PLAINAES,        //<32bit integer>,
                "environment": eb.comm.createUO.consts.environment.DEV, // shows whether the UO should be for production (live), test (pre-production testing), or dev (development)
                "maxtps": eb.comm.createUO.consts.maxtps._1, // maximum guaranteed TPS
                "core": eb.comm.createUO.consts.core.EMPTY, // how many cards have UO loaded permanently
                "persistence": eb.comm.createUO.consts.persistence._1min, // once loaded onto card, how long will the UO stay there without use (this excludes the "core")
                "priority": eb.comm.createUO.consts.priority.DEFAULT, // this defines a) priority when the server capacity is fully utilised and it also defines how quickly new copies of UO are installed (pre-empting icreasing demand)
                "separation": eb.comm.createUO.consts.separation.TIME, // "complete" = only one UO can be loaded on a smartcard at one one time
                "bcr": eb.comm.createUO.consts.YES,      // "yes" will ensure the UO is replicated to provide high availability for any possible service disruption
                "unlimited": eb.comm.createUO.consts.YES,
                "clientiv": eb.comm.createUO.consts.YES, //  if "yes", we expect the data starts with an IV to initialize decryption of data - this is for communication security
                "clientdiv": eb.comm.createUO.consts.NO, // if "yes", we expect the data starting with a diversification 16B for communication keys
                "resource": eb.comm.createUO.consts.resource.GLOBAL,
                "credit": 32766, // <1-32767>, a limit a seed card can provide to the EB service
                "generation": {
                    "commkey": eb.comm.createUO.consts.genKey.CLIENT,
                    "billingkey": eb.comm.createUO.consts.genKey.LEGACY_RANDOM,
                    "appkey": eb.comm.createUO.consts.genKey.CLIENT
                }
            },
            keys: {
                comenc:{
                    key:sjcl.random.randomWords(8)},
                commac:{
                    key:sjcl.random.randomWords(8)},
                comnextenc:{
                    key:sjcl.random.randomWords(8)},
                conextmac:{
                    key:sjcl.random.randomWords(8)},
                app:{
                    key:sjcl.random.randomWords(4)}
            },
            host: settings.enrollHost,
            uoId: 4
            //logger: console.log,
            //debuggingLog: true
        });

        var cl = new eb.client.createUO(cfg);
        var promise = cl.call();

        promise.then(function(data){
            expect(data).to.exist;
            expect(data.result).to.exist;
            expect(data.result.handle).to.exist;
            expect(data.result.handle).is.a('string');
            expect(data.result.handle).to.not.be.empty;
            done();
        }).catch(processFail(this, done));
    });

    it("createUOSimple", function(done){
        var cfg = eb.misc.extend(true, {}, settings, {
            tpl: {
                "environment": eb.comm.createUO.consts.environment.DEV
            },
            keys: {
                app:{
                    key:sjcl.random.randomWords(4)}
            },
            objType: eb.comm.createUO.consts.uoType.PLAINAESDECRYPT
        });

        var cl = new eb.client.createUO(cfg);
        var promise = cl.call();

        promise.then(function(data){
            expect(data).to.exist;
            expect(data.result).to.exist;
            expect(data.result.handle).to.exist;
            expect(data.result.handle).is.a('string');
            expect(data.result.handle).to.not.be.empty;
            done();
        }).catch(processFail(this, done));
    });

});

