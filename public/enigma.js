/**
 * EnigmaBridge API helper functions.
 * @author Dusan Klinec (ph4r05)
 * @license GPL3.
 */

/**
 * Base EB package.
 * @type {{name: string}}
 */
eb = {
    name: "EB",
    /** @namespace Exceptions. */
    exception: {
        /** @constructor Ciphertext is corrupt. */
        corrupt: function (message) {
            this.toString = function () {
                return "CORRUPT: " + this.message;
            };
            this.message = message;
        },
        /** @constructor Invalid input. */
        invalid: function (message) {
            this.toString = function () {
                return "INVALID: " + this.message;
            };
            this.message = message;
        },
    }
};

/**
 * EB misc wrapper.
 * @type {{name: string, genNonce: eb.misc.genNonce, genHexNonce: eb.misc.genHexNonce, genAlphaNonce: eb.misc.genAlphaNonce, xor: eb.misc.xor}}
 */
eb.misc = {
    name: "misc",
    genNonce: function(length, alphabet){
        var nonce = "";
        var alphabetLen = alphabet.length;
        var i = 0;

        for(i = 0; i < length; i++){
            nonce += alphabet.charAt(Math.floor(Math.random() * alphabetLen));
        }

        return nonce;
    },
    genHexNonce: function(length){
        return this.genNonce(length, "0123456789abcdef");
    },
    genAlphaNonce: function (length){
        return this.genNonce(length, "0123456789abcdefghijklmnopqrstuvwxyz");
    },
    xor: function(x,y){
        return [x[0]^y[0],x[1]^y[1],x[2]^y[2],x[3]^y[3]];
    }
};

/**
 * EB padding schemes wrapper.
 * @type {{name: string}}
 */
eb.padding = {
    name: "padding"
};

/**
 * Padding - identity function.
 * @type {{name: string, pad: eb.padding.empty.pad, unpad: eb.padding.empty.unpad}}
 */
eb.padding.empty = {
    name: "empty",
    pad: function(a, blocklen){
        return a;
    },
    unpad: function(a, blocklen){
        return a;
    }
};

/**
 * PKCS7 padding.
 * @type {{name: string, pad: eb.padding.pkcs7.pad, unpad: eb.padding.pkcs7.unpad}}
 */
eb.padding.pkcs7 = {
    name: "pkcs7",
    pad: function(a, blocklen){
        blocklen = blocklen || 16;
        if (!blocklen || (blocklen & (blocklen - 1))){
            throw new sjcl.exception.corrupt("blocklength has to be power of 2");
        }
        if (blocklen != 16){
            throw new sjcl.exception.corrupt("blocklength different than 16 is not implemented yet");
        }

        var bl = sjcl.bitArray.bitLength(a);
        var padLen = (16 - ((bl >> 3) & 15));
        var padFill = padLen * 0x1010101;
        return sjcl.bitArray.concat(a, [padFill, padFill, padFill, padFill]).slice(0, ((bl >> 3) + padLen) >> 2);
    },
    unpad: function(a, blocklen){
        blocklen = blocklen || 16;
        if (!blocklen || (blocklen & (blocklen - 1))){
            throw new sjcl.exception.corrupt("blocklength has to be power of 2");
        }
        if (blocklen != 16){
            throw new sjcl.exception.corrupt("blocklength different than 16 is not implemented yet");
        }

        w = sjcl.bitArray;
        var bl = w.bitLength(a);
        if (bl & 127 || !a.length) {
            throw new sjcl.exception.corrupt("input must be a positive multiple of the block size");
        }

        var bi = a[((bl>>3)>>2) - 1] & 255;
        if (bi == 0 || bi > 16) {
            throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
        }

        var bo = bi * 0x1010101;
        if (!w.equal(w.bitSlice([bo, bo, bo, bo], 0, bi << 3), w.bitSlice(a, (a.length << 5) - (bi << 3), a.length << 5))) {
            throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
        }

        return w.bitSlice(a, 0, (a.length << 5) - (bi << 3));
    }
};

/**
 * Extracts 32bit number from the bitArray.
 * Original extract does not work with blength = 32 as 1<<32 == 1, it returns 0 always.
 *
 * @param a
 * @param bstart
 * @returns {*}
 */
sjcl.bitArray.extract32 = function(a, bstart){
    var x, sh = Math.floor((-bstart-32) & 31);
    if ((bstart + 32 - 1 ^ bstart) & -32) {
        x = (a[bstart/32|0] << (32 - sh)) ^ (a[bstart/32+1|0] >>> sh);
    } else {
        x = a[bstart/32|0] >>> sh;
    }
    return x;
};

/**
 * CBC-MAC with given cipher & padding.
 * @param Cipher
 * @param bs
 * @param padding
 */
sjcl.misc.hmac_cbc = function (Cipher, bs, padding) {
    this._cipher = Cipher;
    this._bs = bs = bs || 16;
    this._padding = padding = padding || eb.padding.empty;
};

/** HMAC with the specified hash function.  Also called encrypt since it's a prf.
 * @param {bitArray|String} data The data to mac.
 */
sjcl.misc.hmac_cbc.prototype.encrypt = sjcl.misc.hmac_cbc.prototype.mac = function (data) {
    var i, w = sjcl.bitArray, bl = w.bitLength(data), bp = 0, output = [], xor = eb.misc.xor;
    var bsb = this._bs << 3;

    data = this._padding.pad(data, this._bs);
    var c = sjcl.codec.hex.toBits('00'.repeat(this._bs));
    for (i = 0; bp + bsb <= bl; i += 4, bp += bsb) {
        c = this._cipher.encrypt(xor(c, data.slice(i, i + 4)));
    }
    return c;
};

/**
 * CBC encryption mode.
 * @type {{name: string, encrypt: sjcl.mode.cbc.encrypt, decrypt: sjcl.mode.cbc.decrypt}}
 */
sjcl.mode.cbc = {
    name: "cbc",
    encrypt: function (a, b, c, d, noPad) {
        if (d && d.length) {
            throw new sjcl.exception.invalid("cbc can't authenticate data");
        }
        if (sjcl.bitArray.bitLength(c) !== 128) {
            throw new sjcl.exception.invalid("cbc iv must be 128 bits");
        }

        var i, w = sjcl.bitArray, bl = w.bitLength(b), bp = 0, output = [], xor = eb.misc.xor;
        if (noPad && (bl & 127) != 0){
            throw new sjcl.exception.invalid("when padding is disabled, plaintext has to be a positive multiple of a block size");
        }
        if ((bl & 7) != 0) {
            throw new sjcl.exception.invalid("pkcs#5 padding only works for multiples of a byte");
        }

        for (i = 0; bp + 128 <= bl; i += 4, bp += 128) {
            c = a.encrypt(xor(c, b.slice(i, i + 4)));
            output.splice(i, 0, c[0], c[1], c[2], c[3]);
        }

        if (!noPad){
            bl = (16 - ((bl >> 3) & 15)) * 0x1010101;
            c = a.encrypt(xor(c, w.concat(b, [bl, bl, bl, bl]).slice(i, i + 4)));
            output.splice(i, 0, c[0], c[1], c[2], c[3]);
        }

        return output;
    },
    decrypt: function (a, b, c, d, noPad) {
        if (d && d.length) {
            throw new sjcl.exception.invalid("cbc can't authenticate data");
        }
        if (sjcl.bitArray.bitLength(c) !== 128) {
            throw new sjcl.exception.invalid("cbc iv must be 128 bits");
        }
        if ((sjcl.bitArray.bitLength(b) & 127) || !b.length) {
            throw new sjcl.exception.corrupt("cbc ciphertext must be a positive multiple of the block size");
        }
        var i, w = sjcl.bitArray, bi, bo, output = [], xor = eb.misc.xor;
        d = d || [];
        for (i = 0; i < b.length; i += 4) {
            bi = b.slice(i, i + 4);
            bo = xor(c, a.decrypt(bi));
            output.splice(i, 0, bo[0], bo[1], bo[2], bo[3]);
            c = bi;
        }
        if (!noPad) {
            bi = output[i - 1] & 255;
            if (bi == 0 || bi > 16) {
                throw new sjcl.exception.corrupt("pkcs#5 padding corrupt"); //TODO: padding oracle?
            }
            bo = bi * 0x1010101;
            if (!w.equal(w.bitSlice([bo, bo, bo, bo], 0, bi << 3), w.bitSlice(output, (output.length << 5) - (bi << 3), output.length << 5))) {
                throw new sjcl.exception.corrupt("pkcs#5 padding corrupt"); //TODO: padding oracle?
            }
            return w.bitSlice(output, 0, (output.length << 5) - (bi << 3));
        } else {
            return output;
        }
    }
};

/**
 * Request builder.
 * @type {{}}
 */
eb.comm = {
    name: "comm",
    demangleNonce: function(nonce){
        ba = sjcl.bitArray;
        var bl = ba.bitLength(nonce);
        if ((bl&7) != 0){
            throw new sjcl.exception.invalid("nonce has to be aligned to bytes");
        }

        var i, w = sjcl.bitArray, bp = 0, output = [], c;
        for (i = 0; bp + 32 <= bl; i += 1, bp += 32) {
            c = nonce.slice(i, i + 1)[0] - 0x01010101;
            output.splice(i, 0, c);
        }

        if (bp+32 == bl){
            return output;
        }

        var rbl = bl - (bp-32);
        var sub = 0x01010101 & (((1<<rbl)-1)<<(32-rbl));
        c = (nonce.slice(i, i + 1)[0] - sub) >>> rbl;
        output.splice(i, 0, c);
        return sjcl.bitArray.clamp(output, bl);
    }
};

/**
 * Raw EB request builder.
 * @param nonce
 * @param aesKey
 * @param macKey
 * @param userObjectId
 * @param reqType
 */
eb.comm.requestBuilder = function(nonce, aesKey, macKey, userObjectId, reqType){
    this.userObjectId = userObjectId || -1;
    this.nonce = nonce || "";
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
    this.reqType = reqType || "PLAINAES";
};

eb.comm.requestBuilder.prototype = {
    /**
     * User object ID, integer type.
     * @input
     */
    userObjectId : -1,

    /**
     * AES communication encryption key, hexcoded string.
     * @input
     */
    aesKey: "",

    /**
     * AES MAC communication key, hexcoded string.
     * @input
     */
    macKey: "",

    /**
     * Freshness nonce / IV, hexcoded string.
     * @input
     */
    nonce: "",

    /**
     * Request type. PLAINAES by default.
     * @input
     */
    reqType: "",

    /**
     * If set to true, request body building steps are logged.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    genNonce: function(){
        this.nonce = eb.misc.genHexNonce(16);
        return this.nonce;
    },

    /**
     * Builds EB request.
     *
     * @param plainData - bitArray of the plaintext data (will be MAC protected).
     * @param requestData - bitArray with userdata to perform operation on (will be encrypted, MAC protected)
     * @returns request body string.
     */
    build: function(plainData, requestData){
        this.nonce = this.nonce || eb.misc.genHexNonce(16);

        // Data format before encryption:
        // buff = 0x1f | <UOID-4B> | userdata
        //
        // Encryption
        // AES-256/CBC/PKCS7, IV = 0x00000000000000000000000000000000
        //
        // MAC
        // AES-256-CBC-MAC.
        //
        // encBlock = enc(buff)
        // result = encBlock || mac(plaindata || encBlock)
        //
        // output = Packet0| _PLAINAES_ | <plain-data-length-4B> | <plaindata> | hexcode(result)

        h = sjcl.codec.hex;
        ba = sjcl.bitArray;
        pad = eb.padding.pkcs7;

        // Plain data is empty for now.
        var baPlain = plainData;
        var plainDataLength = ba.bitLength(baPlain)/8;

        // Input data flag
        var baBuff = h.toBits("0x1f");
        // User Object ID
        baBuff = ba.concat(baBuff, h.toBits(sprintf("%08x", this.userObjectId)));
        // Freshness nonce
        baBuff = ba.concat(baBuff, h.toBits(this.nonce));
        // User data
        baBuff = ba.concat(baBuff, requestData);
        // Add padding.
        baBuff = pad.pad(baBuff);
        this._log("baBuff: " + h.fromBits(baBuff) + "; len: " + ba.bitLength(baBuff));

        var aesKeyBits = h.toBits(this.aesKey);
        var macKeyBits = h.toBits(this.macKey);

        aes = new sjcl.cipher.aes(aesKeyBits);
        aesMac = new sjcl.cipher.aes(macKeyBits);
        hmac = new sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.empty);

        // IV is null, nonce in the first block is kind of IV.
        var IV = h.toBits('00'.repeat(16));
        var encryptedData = sjcl.mode.cbc.encrypt(aes, baBuff, IV, [], true);
        this._log("encrypted: " + h.fromBits(encryptedData) + ", len=" + ba.bitLength(encryptedData));

        // include plain data in the MAC if non-empty.
        var hmacData = hmac.mac(encryptedData);
        this._log("hmacData: " + h.fromBits(hmacData));

        // Build the request block.
        var requestBase = sprintf("Packet0_%s_%04X%s%s%s",
            this.reqType,
            plainDataLength,
            h.fromBits(plainData),
            h.fromBits(encryptedData),
            h.fromBits(hmacData)
        );

        this._log("request: " + requestBase);
        return requestBase;
    },

    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};

/**
 * Base class for parsed raw EB response.
 */
eb.comm.response = function(){

};

eb.comm.response.prototype = {
    /**
     * Parsed status code. 0x9000 = OK.
     * @output
     */
    statusCode: 0,

    /**
     * Parsed status detail.
     * @output
     */
    statusDetail: "",

    /**
     * Plain data parsed from the response.
     * Nor MACed neither encrypted.
     * @output
     */
    plainData: "",

    /**
     * Protected data parsed from the response.
     * Protected by MAC, encrypted in transit.
     * @output
     */
    protectedData: "",

    /**
     * USerObjectID parsed from the response.
     * Ingeter, 4B.
     */
    userObjectID: 0,

    /**
     * Nonce parsed from the RAW response.
     */
    nonce: "",

    /**
     * Function name extracted from the request.
     */
    function: "",

    /**
     * MAC value parsed from the message.
     * If macOk is true, it is same as computed MAC.
     */
    mac: "",

    /**
     * Computed MAC value for the message.
     */
    computedMac: "",

    /**
     * Returns true if MAC verification is OK.
     */
    isMacOk: function(){
        ba = sjcl.bitArray;
        return this.mac
            && this.computedMac
            && ba.bitLength(this.mac) == 16*8
            && ba.bitLength(this.computedMac) == 16*8
            && ba.equal(this.mac, this.computedMac);
    },

    /**
     * Returns true if after parsing, code is OK.
     * @returns {boolean}
     */
    isCodeOk: function(){
        return this.statusCode == 0x9000;
    },

    toString: function(){
        return sprintf("Response{statusCode=%4X, statusDetail=[%s], userObjectId: %08X, function: [%s], " +
            "nonce: [%s], protectedData: [%s], plainData: [%s], mac: [%s], computedMac: [%s], macOK: %d",
            this.statusCode,
            this.statusDetail,
            this.userObjectID,
            this.function,
            sjcl.codec.hex.fromBits(this.nonce),
            sjcl.codec.hex.fromBits(this.protectedData),
            sjcl.codec.hex.fromBits(this.plainData),
            sjcl.codec.hex.fromBits(this.mac),
            sjcl.codec.hex.fromBits(this.computedMac),
            this.isMacOk()
        );
    }
};

/**
 * Raw EB Response parser.
 * @param aesKey
 * @param macKey
 */
eb.comm.responseParser = function(aesKey, macKey){
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
};

eb.comm.responseParser.prototype = {
    /**
     * Parsed user object ID, integer type.
     * @input
     */
    userObjectId : -1,

    /**
     * AES communication encryption key, hexcoded string.
     * @input
     */
    aesKey: "",

    /**
     * AES MAC communication key, hexcoded string.
     * @input
     */
    macKey: "",

    /**
     * Parsed response
     */
    response: null,

    /**
     * If set to true, response body parsing steps are logged to the console.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    /**
     * Returns true if after parsing, code is OK.
     * @returns {boolean}
     */
    success: function(){
        return this.response.isCodeOk();
    },

    /**
     * Parse EB response
     *
     * @param data - json response
     * @returns request unwrapped response.
     */
    parse: function(data){
        if (!data || !data.status || !data.function){
            throw new sjcl.exception.invalid("response data invalid");
        }

        // Build new response message.
        var resp = this.response = new eb.comm.response();
        resp.statusCode = parseInt(data.status, 16);
        resp.statusDetail = data.statusdetail || "";
        resp.function = data.function;
        if (!this.success()){
            this._log("Error in processing, status: " + data.status + ", message: " + resp.statusDetail);
            return resp;
        }

        var resultBuffer = data.result;
        var baResult = h.toBits(resultBuffer.substring(0, resultBuffer.indexOf("_")));
        var plainLen = ba.extract(baResult, 0, 2*8);
        var plainBits = ba.bitSlice(baResult, 2*8, 2*8+plainLen*8);
        var protectedBits = ba.bitSlice(baResult, 2*8+plainLen*8);
        var protectedBitsBl = ba.bitLength(protectedBits);

        // Decrypt and verify
        h = sjcl.codec.hex;
        ba = sjcl.bitArray;
        pad = eb.padding.pkcs7;

        var aesKeyBits = h.toBits(this.aesKey);
        var macKeyBits = h.toBits(this.macKey);
        aes = new sjcl.cipher.aes(aesKeyBits);
        aesMac = new sjcl.cipher.aes(macKeyBits);
        hmac = new sjcl.misc.hmac_cbc(aesMac, 16, eb.padding.empty);

        // Verify MAC.
        var macTagOffset = protectedBitsBl - 16*8;
        var dataToMac = ba.bitSlice(protectedBits, 0, macTagOffset);
        if ((ba.bitLength(dataToMac) & 127) != 0){
            throw new sjcl.exception.corrupt("Padding size invalid");
        }

        resp.mac = ba.bitSlice(protectedBits, macTagOffset);
        if (ba.bitLength(resp.mac) != 16*8){
            throw new sjcl.exception.corrupt("MAC corrupted");
        }

        resp.computedMac = hmac.mac(dataToMac);
        this._log("returnedMac: " + h.fromBits(resp.mac));
        this._log("computedMac: " + h.fromBits(resp.computedMac));
        if (!resp.mac || !ba.equal(resp.mac, resp.computedMac)){
            throw new sjcl.exception.corrupt("Padding is not valid"); //TODO: padding oracle?
        }

        // Decrypt.
        var dataToDecrypt = ba.bitSlice(protectedBits, 0, macTagOffset);
        if ((ba.bitLength(dataToDecrypt) & 127) != 0){
            throw new sjcl.exception.corrupt("Ciphertext block invalid");
        }

        // IV is null, nonce in the first block is kind of IV.
        var IV = h.toBits('00'.repeat(16));
        var decryptedData = sjcl.mode.cbc.decrypt(aes, dataToDecrypt, IV, [], false);
        this._log("decryptedData: " + h.fromBits(decryptedData) + ", len=" + ba.bitLength(decryptedData));

        // Check the flag.
        var responseFlag = ba.extract(decryptedData, 0, 8);
        if (responseFlag != 0xf1){
            throw new sjcl.exception.corrupt("Given data packet is not a response (flag mismatch)");
        }

        // Get user object.
        resp.userObjectID = ba.extract32(decryptedData, 8);
        this._log("returnedUserObject: " + sprintf("%08x", resp.userObjectID));

        // Get nonce, mangled.
        var returnedMangledNonce = ba.bitSlice(decryptedData, 5*8, 5*8+8*8);
        resp.nonce = eb.comm.demangleNonce(returnedMangledNonce);
        this._log("returnedNonce: " + h.fromBits(resp.nonce));

        // Response = plainData + decryptedData.
        resp.protectedData = ba.bitSlice(decryptedData, 5*8+8*8);
        resp.plainData = plainBits;
        this._log("responseData: " + h.fromBits(resp.protectedData));

        return resp;
    },

    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};

/**
 * EB request builder.
 * @param apiKey
 * @param aesKey
 * @param macKey
 * @param userObjectId
 */
eb.comm.request = function(apiKey, aesKey, macKey, userObjectId){
    this.apiKey = apiKey || "";
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
    this.userObjectId = userObjectId || -1;
};

eb.comm.request.prototype = {
    /**
     * User object ID to perform operation with, integer type.
     * @input
     */
    userObjectId : -1,

    /**
     * AES communication encryption key, hexcoded string.
     * @input
     */
    aesKey: "",

    /**
     * AES MAC communication key, hexcoded string.
     * @input
     */
    macKey: "",

    /**
     * Function to call
     * @input
     * @default ProcessData
     */
    callFunction: "ProcessData",

    /**
     * Type of the data request.
     * @input
     * @default PLAINAES
     */
    callRequestType: "PLAINAES",

    /**
     * User API key
     * @input
     */
    apiKey: "",

    /**
     * Response object produced by response parser
     * @output
     */
    response: null,

    /**
     * Method to do REST request with. GET or POST are allowed.
     * @input
     */
    requestMethod: "POST",

    /**
     * Scheme used to contact remote API.
     * @input
     * @default https
     */
    requestScheme: "https",

    /**
     * Request timeout in milliseconds.
     * @input
     * @default 30000
     */
    requestTimeout: 30000,

    /**
     * Endpoint where EB API listens
     * @input
     */
    remoteEndpoint: "dragonfly.smarthsm.net",

    /**
     * Port of the remote endpoint
     * @input
     * @default 11180
     */
    remotePort: 11180,

    /**
     * Ajax call settings. User can modify default behavior by specifying settings here.
     * @input
     */
    ajaxSettings: {},

    /**
     * If set to true, request body building steps are logged.
     * @input
     */
    debuggingLog: false,

    /**
     * Aux logging function
     * @input
     */
    logger: null,

    /**
     * Request builder used to build the request.
     * @output
     */
    requestBuilder: null,

    /**
     * Response parser parsing raw EB response.
     * @output
     */
    responseParser: null,

    /**
     * Composite API key for the request.
     * Generated before request is sent.
     * @private
     */
    _apiKeyReq: "",

    /**
     * Socket equivalent request, for debugging.
     * Generated when building the request.
     * @private
     */
    _socketRequest: "",

    /**
     * Request block generated by request builder.
     * @private
     */
    _requestBlock: "",

    /**
     * Version of EB API.
     * @private
     */
    _apiVersion: "1.0",

    _doneCallback: function(response, requestObj, jqXHR){},
    _failCallback: function(failType, jqXHR, textStatus, errorThrown, requestObj){},
    _alwaysCallback: function(requestObj){},

    done: function(x){
        this._doneCallback = x;
        return this;
    },

    fail: function(x){
        this._failCallback = x;
        return this;
    },

    always: function(x){
        this._alwaysCallback = x;
        return this;
    },

    /**
     * Returns nonce from the request builder. If set.
     * @returns {*}
     */
    getNonce: function(){
        if (this.requestBuilder == null){
            return null;
        }

        return this.requestBuilder.nonce;
    },

    /**
     * Generates new nonce to the request builder.
     * If request builder is null, new is constructed.
     * @returns {string|*|string}
     */
    genNonce: function(){
        if (this.requestBuilder == null){
            this.requestBuilder = new eb.comm.requestBuilder();
        }

        this.requestBuilder.nonce = eb.misc.genHexNonce(16);
        return this.requestBuilder.nonce;
    },

    /**
     * Returns if the EB returned with success.
     * Note: Data still may have invalid MAC.
     * @returns {*|boolean}
     */
    wasSuccessful: function(){
        return this.responseParser.success();
    },

    /**
     * Initializes state and builds request
     * @param plainData
     * @param requestData
     */
    build: function(plainData, requestData){
        this._log("Building request body");
        this._apiKeyReq = sprintf("%s%010x", this.apiKey, this.userObjectId);

        // Build a new EB request.
        this.requestBuilder = new eb.comm.requestBuilder();
        this.requestBuilder.aesKey = this.aesKey;
        this.requestBuilder.macKey = this.macKey;
        this.requestBuilder.userObjectId = this.userObjectId;
        this.requestBuilder.reqType = this.callRequestType;
        this.requestBuilder.debuggingLog = this.debuggingLog;
        this.requestBuilder.logger = this.logger;
        this.requestBuilder.genNonce();

        this._requestBlock = this.requestBuilder.build(plainData, requestData);
        var nonce = this.requestBuilder.nonce;
        this._log("Nonce generated: " + nonce);

        var url = this.getApiUrl();
        var apiData = this.getApiRequestData();

        this._log("URL: " + url + ", method: " + this.requestMethod);
        this._log("UserData: " + JSON.stringify(apiData));
        this._log("SocketReq: " + JSON.stringify(this.getSocketRequest()));
    },

    /**
     * Builds EB request.
     *
     * @param plainData - bitArray of the plaintext data (will be MAC protected).
     * @param requestData - bitArray with userdata to perform operation on (will be encrypted, MAC protected)
     * @returns request body string.
     */
    call: function(plainData, requestData){
        if (!this._apiKeyReq){
            this.build(plainData, requestData);
        }

        var url = this.getApiUrl();
        var apiData = this.getApiRequestData();
        var ajaxSettings = {
            url: url,
            type: this.requestMethod,
            dataType: 'json',
            timeout: this.requestTimeout,
            data: this.requestMethod == "POST" ? JSON.stringify(apiData) : null
        };

        // Extend ajax settings with user provided settings.
        $.extend(ajaxSettings, this.ajaxSettings || {});
        var ebc = this;

        // Do the remote call
        this._log("Sending remote request...");
        $.ajax(ajaxSettings)
            .done(function (data, textStatus, jqXHR) {
                ebc._log("Request done. Status: " + textStatus);
                ebc._log("Raw response: " + JSON.stringify(data));
                ebc._processAnswer(data, textStatus, jqXHR);

            }).fail(function (jqXHR, textStatus, errorThrown) {
                ebc._log("Error: " + sprintf("Error: status=[%d], responseText: [%s], error: [%s], status: [%s] misc: %s",
                        jqXHR.status, jqXHR.responseText, errorThrown, textStatus, JSON.stringify(jqXHR)));

                if (this._failCallback) {
                    this._failCallback(0x1, jqXHR, textStatus, errorThrown, ebc);
                }

            }).always(function (data, textStatus, jqXHR) {
                if (this._alwaysCallback) {
                    this._alwaysCallback(ebc);
                }
            });
    },

    /**
     * Processing response from the server.
     * @private
     */
    _processAnswer: function(data, textStatus, jqXHR){
        try {
            h = sjcl.codec.hex;

            // Build a new EB request.
            this.responseParser = new eb.comm.responseParser();
            this.responseParser.aesKey = this.aesKey;
            this.responseParser.macKey = this.macKey;
            this.responseParser.debuggingLog = true;
            this.responseParser.logger = this.logger;

            this.response = this.responseParser.parse(data);
            if (this.responseParser.success()) {
                this._log("Processing complete, response: " + this.response.toString());
                // TODO: check nonce match & function match & userObjectId match.
                if (this._doneCallback){
                    this._doneCallback(this.response, this, jqXHR)
                }

            } else {
                this._log("Failure, status: " + this.response.toString());
                if (this._failCallback){
                    this._failCallback(0x2, jqXHR, textStatus, this.response, this);
                }
            }

        } catch(e){
            this._log("Excetion when processing the response: " + e);
            if (this._failCallback){
                this._failCallback(0x3, jqXHR, textStatus, e, this);
            }
        }
    },

    /**
     * Returns remote API URL to query with Ajax.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiUrl: function(){
        if (this.requestMethod == "POST"){
            return sprintf("%s://%s:%d/%s/%s/%s/%s",
                this.requestScheme,
                this.remoteEndpoint,
                this.remotePort,
                this._apiKeyReq,
                this._apiVersion,
                this.callFunction,
                this.getNonce());

        } else if (this.requestMethod == "GET"){
            return sprintf("%s://%s:%d/%s/%s/%s/%s/%s",
                this.requestScheme,
                this.remoteEndpoint,
                this.remotePort,
                this._apiKeyReq,
                this._apiVersion,
                this.callFunction,
                this.getNonce(),
                this._requestBlock);

        } else {
            throw new eb.exception.invalid("Invalid configuration, unknown method: " + this.requestMethod);
        }
    },

    /**
     * Returns Ajax request data.
     * According to current request settings.
     * Note: Request has to be built when calling this function.
     *
     * @returns {*}
     */
    getApiRequestData: function(){
        if (this.requestMethod == "POST") {
            return {data: this._requestBlock};
        } else {
            return {};
        }
    },

    /**
     * Returns raw EB request for raw socket transport method.
     * For debugging & verification.
     *
     * @returns {string}
     */
    getSocketRequest: function(){
        this._socketRequest = {
            objectid:this._apiKeyReq,
            data:this._requestBlock,
            function:this.callFunction,
            nonce:this.getNonce(),
            version:this._apiVersion};
        return this._socketRequest;
    },

    /**
     * Logger wrapper. Allowing to log messages both to console and provided logger.
     * @param x message to log.
     * @private
     */
    _log:  function(x) {
        if (!this.debuggingLog){
            return;
        }

        if (console && console.log){
            console.log(x);
        }

        if (this.logger){
            this.logger(x);
        }
    }
};
