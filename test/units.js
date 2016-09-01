var expect    = require("chai").expect;
var eb        = require("../lib/enigma");

// For more info:
// https://mochajs.org/
describe("EB client units", function() {
    /**
     * Install fix seeded random number generator.
     */
    before(function(){
        var FixRandom = function(seed){ this.seed = seed; };
        FixRandom.prototype = {
            gen: function(){
                var x = Math.sin(this.seed++) * 10000;
                return Math.floor(4294967296 * (x - Math.floor(x)));
            },
            randomWords: function (nwords, paranoia) {
                var out=[];
                for(var i=0; i<nwords; i++){
                    out.push(this.gen());
                }
                return out;
            },
            setDefaultParanoia: function (paranoia, allowZeroParanoia){},
            addEntropy: function (data, estimatedEntropy, source) {},
            isReady: function (paranoia) {return 1;},
            getProgress: function (paranoia) {return 1.0;},
            startCollectors: function () {},
            stopCollectors: function () {},
            addEventListener: function (name, callback) {},
            removeEventListener: function (name, cb) {}
        };

        eb.misc.sjcl.random = new FixRandom(314);
    });

    describe("misc", function() {
        it("rand-fix", function() {
            var w = eb.misc.sjcl.random.randomWords(4, 0);
            expect(eb.misc.inputToHex(w)).to.equal("12291ae8552842a6df9c6df165dbca23");
        });
    });

    describe("CBC-MAC", function() {
        it("cbc-mac-test01", function() {
            var macKeyBits = eb.misc.inputToBits("0123456789aabbccddeeff0011223344");
            var aesMac = new eb.misc.sjcl.cipher.aes(macKeyBits);
            var hmac = new eb.misc.sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.pkcs7);
            var hmacData = hmac.mac(eb.misc.inputToBits("0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff"));
            expect(eb.misc.inputToHex(hmacData)).to.equal("54e552ceb4665f8d65f467e5c84e6316");
        });
    });

    describe("ProcessDataBuilder", function(){
        it("process-data-enc-mac", function(){
            var input  = eb.misc.inputToBits("6bc1bee22e409f96e93d7e117393172a");
            var aesKey = eb.misc.inputToBits("e134567890123456789012345678901234567890123456789012345678901234");
            var macKey = eb.misc.inputToBits("e224262820223456789012345678901234567890123456789012345678901234");

            var bb = new eb.comm.processDataRequestBodyBuilder();
            bb.aesKey = aesKey;
            bb.macKey = macKey;
            bb.userObjectId = 0xee01;
            bb.nonce = eb.misc.inputToBits("da3903ed1894e307");

            var block = bb.build([], input);
            expect(block).to.equal("Packet0_PLAINAES_0000a83d7c7200e54ab8c47b81931a675bcf8ebcb9c68aa7b8519e49aefd1bfb3525b55f531fe5b2d7ab30ed4fdd2c13bd52");
        });
    });

    describe("CreateUO", function(){
        it("template-filler", function(){
            var appKey = eb.misc.inputToBits("97ea4f23b43d64acc69316db58c180f4");
            var commAeskey = eb.misc.inputToBits("80895c2291b54eeb447aefdba4ef5b03dce3003c72f1c451f722c519aa5a1377");
            var commMackey = eb.misc.inputToBits("51f80524e521a3f32ce4bc9c45df3ac37217482843fd196a457ef12a574479a0");
            var tpl = {"objectid":"0000226a","encryptionoffset":424,"flagoffset":104,"policyoffset":184,"scriptoffset":280,
                "template":"01134301010000226a00300004041a00170035002300fdd00000000000000000010db0001001000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000160001001000000000000000000000000000000000","templatehs":"d2011301134301010000226a00300004041a00170035002300fdd00000000000000000010db0001001000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000160001001000000000000000000000000000000000d1002dd10101ffff38000d00023101b801003202c801003303c801003404d801003505d801003606e801003708180080","importkeys":[{"id":"527b8855d3544fb87a8d2a372e551421165d05ad699475c62517c24dce0a7023","type":"rsa2048","key":"810003010001820100e1e06b76f97bcd827c98cc3b41a85040ccdc61cf725814fdb9e95f53062912e939b13cf1ce27d07b4478577a209cffdbdea2902919c087088f85d5ed1d0b0cdcefd823b649714f699531d9b81008af635ea9796782fe3c403c0e5de215587806f30e16094da0160589e9801cbaf40e63fd2d72cb85cb7fc19a377b0fa92e7d908e6a69aabc4c5ba22d32e5587e0ed812b4c162668498fde5540893c1c0884151609393d8cccdee3eeb88ae91243216b2269273f9a523b95ccfe5b1f9e54fd24f7377a2abd7c6439ec46097c4701e58c24933022d438b77673c300ea681e473d24618f979403da679dd5c3ce0b74c16a95c9647407c2cdc113b927544ecd8c695"}],
                "keyoffsets":[
                    {"offset":1768,"length":256,"tlvtype":1,"type":"billing"},
                    {"offset":2072,"length":128,"tlvtype":1,"type":"app"},
                    {"offset":440,"length":256,"type":"commk"},
                    {"offset":712,"length":256,"type":"comenc"},
                    {"offset":968,"length":256,"type":"commac"},
                    {"offset":1240,"length":256,"type":"comnextenc"},
                    {"offset":1496,"length":256,"type":"comnextmac"}],"authorization":""
            };

            // Fix seeding, paranoia to zero.
            eb.misc.sjcl.random.setDefaultParanoia(0, "Setting paranoia=0 will ruin your security; use it only for testing");
            var builder = new eb.comm.createUO.templateFiller({template: tpl});
            var keys = {
                comenc:{
                    key:commAeskey},
                commac:{
                    key:commMackey},
                comnextenc:{
                    key:eb.misc.getZeroBits(256)},
                conextmac:{
                    key:eb.misc.getZeroBits(258)},
                app:{
                    key:appKey}
            };
            var buildReq = builder.build({keys: keys});
            expect(eb.misc.inputToHex(buildReq.uo)).to.equal("a101007ccdd23f8ac110facbf2c85b501786e0f1bd2d6839d9bd758ee795c08ef6b574f77b63e3ce79f2f2bf9faccbce1a22b69181eff0b77266f8ce9c7f94a50c5c1d5affabdc0a62b9765dc8f8313598ab96ebde7be3d308812e401d7d6fa94329a4a8d710f3457f272b8349686eca2de502cc996c735bd1927d39ec5656b4e36df7f4e50eb5c576d04d4d3a98cbfee4b04a0655a42b55fa6ffe5ed689de11e79e437e7e04012a5faf8703a938e0e0deaa4ae6b7e88bd0b754bb9a08dabd4dc64f5fdd220f366f67a1807bb13c07bfbdc42612bc4a2fbf1762d7b31883f5127bd41beefee00a0c820d64ff5d6f21a9346d3ed4c23b886e9b1e47edd7cd978b1f5b6ea2013001134301010000226a00300004040200170035002300fdd00000000000000000010db0001001000000000000000000000000000000a24aa0f4f36ce62a1b5ea51fa16ca5b419672b895f52da588b432f65af909ef9b8c80a04e7e8b9e76b260534c336f4990448a9abf38a529f2e0822d08b52fbca2a4101896135b53ad934bd4db6be5aedc5206ed1bd1e95a0d38e4725b807299bb391bb6e2af5d52d561173f8c3166070d4bf8e4921e2fa78474d04cfc40deab2176ebdae4c956c3c726748202c61134369bce12ae8e0198038995b8bcc4d51d00f3f3328d835eb729770b4eb4364e7d096a6d4a91f8cecff1b06771484954cb2d7c93f9feb086e095d802250cf14d4dadc676c5b14994722bf3387692748cf280b0b0b0b0b0b0b0b0b0b0b429bc5f0034ec76e11f0ef35f91bc8b7");
        });
    });
});
