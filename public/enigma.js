String.prototype.hexEncode = function(){
    var hex, i;

    var result = "";
    for (i=0; i<this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000"+hex).slice(-4);
    }

    return result
};

String.prototype.hexDecode = function(){
    var j;
    var hexes = this.match(/.{1,4}/g) || [];
    var back = "";
    for(j = 0; j<hexes.length; j++) {
        back += String.fromCharCode(parseInt(hexes[j], 16));
    }

    return back;
};

/**
 * Base EB package.
 * @type {{name: string}}
 */
eb = {
    name: "EB"
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
    c = sjcl.codec.hex.toBits('00'.repeat(this._bs));
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
    encrypt: function (a, b, c, d) {
        if (d && d.length) {
            throw new sjcl.exception.invalid("cbc can't authenticate data");
        }
        if (sjcl.bitArray.bitLength(c) !== 128) {
            throw new sjcl.exception.invalid("cbc iv must be 128 bits");
        }
        var i, w = sjcl.bitArray, bl = w.bitLength(b), bp = 0, output = [], xor = eb.misc.xor;
        if ((bl & 7) != 0) {
            throw new sjcl.exception.invalid("pkcs#5 padding only works for multiples of a byte");
        }
        for (i = 0; bp + 128 <= bl; i += 4, bp += 128) {
            c = a.encrypt(xor(c, b.slice(i, i + 4)));
            output.splice(i, 0, c[0], c[1], c[2], c[3]);
        }
        bl = (16 - ((bl >> 3) & 15)) * 0x1010101;
        c = a.encrypt(xor(c, w.concat(b, [bl, bl, bl, bl]).slice(i, i + 4)));
        output.splice(i, 0, c[0], c[1], c[2], c[3]);
        return output;
    },
    decrypt: function (a, b, c, d) {
        if (d && d.length) {
            throw new sjcl.exception.invalid("cbc can't authenticate data");
        }
        if (sjcl.bitArray.bitLength(c) !== 128) {
            throw new sjcl.exception.invalid("cbc iv must be 128 bits");
        }
        if ((sjcl.bitArray.bitLength(b) & 127) || !b.length) {
            throw new sjcl.exception.corrupt("cbc ciphertext must be a positive multiple of the block size");
        }
        var i, w = sjcl.bitArray, bi, bo, output = [];
        d = d || [];
        for (i = 0; i < b.length; i += 4) {
            bi = b.slice(i, i + 4);
            bo = xor(c, a.decrypt(bi));
            output.splice(i, 0, bo[0], bo[1], bo[2], bo[3]);
            c = bi;
        }
        bi = output[i - 1] & 255;
        if (bi == 0 || bi > 16) {
            throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
        }
        bo = bi * 0x1010101;
        if (!w.equal(w.bitSlice([bo, bo, bo, bo], 0, bi << 3), w.bitSlice(output, (output.length << 5) - (bi << 3), output.length << 5))) {
            throw new sjcl.exception.corrupt("pkcs#5 padding corrupt");
        }
        return w.bitSlice(output, 0, (output.length << 5) - (bi << 3));
    }
};

/**
 * Request builder.
 * @type {{}}
 */
eb.comm = {
    name: "comm",
    buildRequest : function(userObjectId, nonce, aesKey, macKey, plainData, requestData){

    }
};

eb.comm.requestBuilder = function(nonce, aesKey, macKey, userObjectId, reqType){
    this.userObjectId = userObjectId || -1;
    this.nonce = nonce || "";
    this.aesKey = aesKey || "";
    this.macKey = macKey || "";
    this.reqType = reqType || "PLAINAES";
};

eb.comm.requestBuilder.prototype = {
    userObjectId : -1,
    aesKey: "",
    macKey: "",
    nonce: "",
    reqType: "",

    genNonce: function(){
        this.nonce = eb.misc.genHexNonce(16);
        return this.nonce;
    },

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
        baBuff = ba.concat(baBuff, h.toBits(sprintf("%04x", this.userObjectId)));
        // Freshness nonce
        baBuff = ba.concat(baBuff, h.toBits(this.nonce));
        // User data
        baBuff = ba.concat(baBuff, requestData);
        // Add padding.
        baBuff = pad.pad(baBuff);
        console.log("baBuff: " + h.fromBits(baBuff) + "; len: " + ba.bitLength(baBuff));

        var aesKeyBits = h.toBits(this.aesKey);
        var macKeyBits = h.toBits(this.macKey);

        aes = new sjcl.cipher.aes(aesKeyBits);
        aesMac = new sjcl.cipher.aes(macKeyBits);
        hmac = new sjcl.misc.hmac_cbc(aesMac);

        // IV is null, nonce in the first block is kind of IV.
        var IV = h.toBits('00'.repeat(16));
        var encryptedData = sjcl.mode.cbc.encrypt(aes, baBuff, IV, []);
        console.log("encrypted: " + h.fromBits(encryptedData));

        // include plain data in the MAC if non-empty.
        var toMac = encryptedData;
        if (plainDataLength > 0){
            toMac = ba.concat(baPlain, encryptedData);
            toMac = pad.pad(toMac);
        }

        var hmacData = hmac.mac(toMac);
        console.log("hmacData: " + h.fromBits(hmacData));

        // Build the request block.
        var requestBase = sprintf("Packet0_%s_%04X%s%s%s",
            this.reqType,
            plainDataLength,
            h.fromBits(plainData),
            h.fromBits(encryptedData),
            h.fromBits(hmacData)
        );

        console.log("request: " + requestBase);
        return requestBase;
    }
};


