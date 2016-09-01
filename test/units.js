"use strict";
var expect = require("chai").expect;
var eb = require("../lib/enigma");
var rnd = eb.misc.sjcl.random;

// For more info:
// https://mochajs.org/
describe("EB client units", function() {
    /**
     * Install fix seeded random number generator.
     */
    beforeEach(function(){
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

    describe("crypto", function() {
        it("cbc-mac-test01", function() {
            var macKeyBits = eb.misc.inputToBits("0123456789aabbccddeeff0011223344");
            var aesMac = new eb.misc.sjcl.cipher.aes(macKeyBits);
            var hmac = new eb.misc.sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.pkcs7);
            var hmacData = hmac.mac(eb.misc.inputToBits("0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff"));
            expect(eb.misc.inputToHex(hmacData)).to.equal("54e552ceb4665f8d65f467e5c84e6316");
        });

        it("padding-pkcs7", function() {
            for(var i=0; i<10; i++){
                var ln = 8*(1 + Math.abs(rnd.randomWords(1)[0] % 64));
                var input = eb.misc.getRandomBits(ln);
                var out = eb.padding.pkcs7.unpad(eb.padding.pkcs7.pad(input));
                expect(eb.misc.inputToHex(out)).to.equal(eb.misc.inputToHex(input));
            }
        });

        it("padding-pkcs15", function() {
            for(var i=0; i<10; i++){
                var ln = 8*(1 + Math.abs(rnd.randomWords(1)[0] % 120));
                var mode = 1 + Math.abs(rnd.randomWords(1)[0] % 2);
                var input = eb.misc.getRandomBits(ln);
                var out = eb.padding.pkcs15.unpad(eb.padding.pkcs15.pad(input, 1024, mode));
                expect(eb.misc.inputToHex(out)).to.equal(eb.misc.inputToHex(input));
            }
        });
    });

    describe("ProcessData", function(){
        it("request-builder", function(){
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
                "template":"01134301010000226a00300004041a00170035002300fdd00000000000000000010db0001001000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000160001001000000000000000000000000000000000",
                "templatehs":"d2011301134301010000226a00300004041a00170035002300fdd00000000000000000010db0001001000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000000160001001000000000000000000000000000000000d1002dd10101ffff38000d00023101b801003202c801003303c801003404d801003505d801003606e801003708180080",
                "importkeys":[{"id":"527b8855d3544fb87a8d2a372e551421165d05ad699475c62517c24dce0a7023","type":"rsa2048","key":"810003010001820100e1e06b76f97bcd827c98cc3b41a85040ccdc61cf725814fdb9e95f53062912e939b13cf1ce27d07b4478577a209cffdbdea2902919c087088f85d5ed1d0b0cdcefd823b649714f699531d9b81008af635ea9796782fe3c403c0e5de215587806f30e16094da0160589e9801cbaf40e63fd2d72cb85cb7fc19a377b0fa92e7d908e6a69aabc4c5ba22d32e5587e0ed812b4c162668498fde5540893c1c0884151609393d8cccdee3eeb88ae91243216b2269273f9a523b95ccfe5b1f9e54fd24f7377a2abd7c6439ec46097c4701e58c24933022d438b77673c300ea681e473d24618f979403da679dd5c3ce0b74c16a95c9647407c2cdc113b927544ecd8c695"}],
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
            expect(eb.misc.inputToHex(buildReq.uo)).to.equal("a101003998cfc55a52639be8654e63dbcca2d6638d3ebfafa37fbe5febe11d6dbc43ed415dff7bde21ef30f59cef80d0fe3634fe316b0dffbf2f2139bd1d833eee28ec6dc2cf39e803ea6286cfd192ea4a3eea9c186b0cc5c4a17be06dcb2594ede99a662d577f7d6fd68e11e95ccd5f41ab2d28b654a50efa634cadac077457936245dfc2941faa4c8f583e65842a8afa73c005c61f541814bda8a71b40a4241f4e7b4bb9c9660f3f2d2c007e7c10181a5d4bef4619bbe96abd22c9a9673f767870f5abb5b04db302302f6eb37f48560ea4c87f0002d469cdbbcd903717ac37c8e35abd6c8ac81c0c6701d7dade86a681fb6758fffb4dc15a1d283c7d4b68e76e9b6ea2013001134301010000226a00300004040200170035002300fdd00000000000000000010db00010010000000000000000000000000000006c063d46dd808616a5979af881ae2a757fdd36bebe89c2f58b6134fdde9a39ec8f037489dfa2da943c55c8862afd7e8a60377058c5f8c8cb220fa26e80a95aee65580b65511decde8a7b7e142445e10382c0b9a97e1de28e49b2f8d6e9c7607546c0e0db474de07787a43f65c0305fcb619e86eb713b9df4e790486ded39317dc2dd28aab3b4d9e2e54a24d3312b99e7044273384d76ffa5b3b589e1c20423293997b1c6fd918d927c11eb33fbf0a85b7641deecf21491a4348986ceb69b4560833c40ba81ff2f39078387c9954dc3803c0dac2f69476c52509e33459111b0db0b0b0b0b0b0b0b0b0b0b0b5ef81fd00a8f6f2368b9428a621f9067");
        });
    });
});
