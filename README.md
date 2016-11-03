# [Enigma Bridge] JavaScript client

*client.js* is a JavaScript client for [Enigma Bridge] service.

With this repo you can use [Enigma Bridge] encryption service.

## Install

```sh
npm install ebclient.js
```

## Usage

The `client.js` can be used either in NodeJS v0.12 - v6 or in the browser (packaged by browserify).

There are few levels of the API, `eb.comm` is the low level API with additional complexity, with low level requests, etc..
You probably won't need to touch this.

The main API you will interface with is `eb.client`. It provides high-level API for accessing EnigmaBridge services
with convenience and ease. It works with Promise pattern.

## Examples

The few basic examples for using this client for communication with EB.

### Process Data

The basic EnigmaBridge usage is to perform an operation on your input data. E.g., decrypt data with RSA private key stored in the
 Enigma Bridge secure hardware. The ProcessData operation does exactly this.

```javascript
"use strict";
var eb = require("ebclient.js");
var sjcl = eb.misc.sjcl;

// Define basic EB configuration - shared among many requests
var config = new eb.client.Configuration({
    endpointProcess: 'https://site2.enigmabridge.com:11180',
    endpointEnroll: 'https://site2.enigmabridge.com:11182',
    apiKey: 'TEST_API',

    timeout: 30000,
    retry: {
        maxAttempts: 2
    }
});

// Define UserObject to operate with, for particular operation.
var settings = {
    config: config,
    uoId: 'EE01',
    uoType: '4',
    aesKey: 'e134567890123456789012345678901234567890123456789012345678901234',
    macKey: 'e224262820223456789012345678901234567890123456789012345678901234'
};

// Input can be either hex-coded string or SJCL bitArray (array of 32bit words / integers).
var input = '6bc1bee22e409f96e93d7e117393172a';
var cl = new eb.client.processData(settings);
var promise = cl.call(input);

promise.then(function(data){
    console.log(eb.misc.inputToHex(data.data) == '95c6bb9b6a1c3835f98cc56087a03e82');
}).catch(function(error){
    console.log(error);
});
```

### Create User Object

In order to be able to call ProcessData you first need to create User Object in the EnigmaBridge. You can either import
a key into the User Object if you have it (e.g., AES key known to you, RSA key) or you can let EnigmaBridge generate a
new key in the secure hardware so you benefit from the secure RNG and the fact you don't really know the secret value
thus nobody can steal it from you - it never leaves the secure hardware.

* User object can hold e.g., RSA-2048 private key or AES encryption/decryption key.
* Each UserObject has one operation associated with it. For RSA-2048 key it is typically a decryption.
* Symmetric encryption key - e.g. AES encryption key has also one operation thus you need two user objects, with the same AES key inside, to perform both encryption and decryption.

In the example below we create a new AES-128 key in the client and we import the key to the EnigmaBridge.
The result is a new User Object which internally contains the AES-128 bit key and allows to perform a decryption with the key.

```javascript
"use strict";
var eb = require("ebclient.js");
var sjcl = eb.misc.sjcl;

// Define basic EB configuration - shared among many requests
var config = new eb.client.Configuration({
    endpointProcess: 'https://site2.enigmabridge.com:11180',
    endpointEnroll: 'https://site2.enigmabridge.com:11182',
    apiKey: 'TEST_API',

    timeout: 30000,
    retry: {
        maxAttempts: 2
    }
});

// Create randomly generated AES-128 key, with DECRYPT operation associated
// with it, in development environment.
var cfg = {
    config: config,
    tpl: {
        "environment": eb.comm.createUO.consts.environment.DEV
    },
    keys: {
        app: {
            key: sjcl.random.randomWords(4)
        }
    },
    objType: eb.comm.createUO.consts.uoType.PLAINAESDECRYPT
};

var cl = new eb.client.createUO(cfg);
var promise = cl.call();

promise.then(function(data){
    // Call ProcessData on the input data - here we verify
    // it works as we expect.
    var aes = new sjcl.cipher.aes(cfg.keys.app.key);
    var input2 = '6bc1bee22e409f96e93d7e117393172a';

    // Pass data to the process data function - contains UserObject
    // which ProcessData parses and uses.
    var cfg2 = eb.misc.extend(true, {}, data);
    var cl2 = new eb.client.processData(cfg2);
    var promise2 = cl2.call(input2);

    promise2.then(function(data){
        var desiredOutput = aes.decrypt(eb.misc.inputToBits(input2));
        expect(data.data).to.deep.equal(desiredOutput);
        done();
    }).catch(function(error){
        console.log(error);
    });

}).catch(function(error){
    console.log(error);
});
```

### Create User Object - RSA

In this example we create a new RSA private key right in the secure hardware without exposing the value.
The createRSA call also returns the public key part - the public modulus and the public exponent.

```javascript
"use strict";
var eb = require("ebclient.js");
var sjcl = eb.misc.sjcl;

// Define basic EB configuration - shared among many requests
var config = new eb.client.Configuration({
    endpointProcess: 'https://site2.enigmabridge.com:11180',
    endpointEnroll: 'https://site2.enigmabridge.com:11182',
    apiKey: 'TEST_API',

    timeout: 30000,
    retry: {
        maxAttempts: 2
    }
});

// Specification: Create a new RSA-1024 key in the hardware, devel environment.
var cfg = {
    config: config,
    tpl: {
        "environment": eb.comm.createUO.consts.environment.DEV
    },
    bits: 1024
};

var cl = new eb.client.createUO(cfg);
var promise = cl.call();

promise.then(function(data){
    // ProcessData demo: RSA decryption of the 00000..1
    // For RSA it holds: 1 ^ e mod N = 1
    var input2 = '0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001';
    var cfg2 = eb.misc.extend(true, {}, data);
    var cl2 = new eb.client.processData(cfg2);

    var promise2 = cl2.call(input2);
    promise2.then(function(data){
        console.log(eb.misc.inputToHex(data.data));

        // rsaPrivateKey object contains also the public part of
        // the key: modulus and public exponent
        console.log(data.rsaPrivateKey);
        done();
    }).catch(function(error){
        console.log(error);
    });

}).catch(function(error){
    console.log(error);
});
```

## CLI
Example:

```sh
./bin/eb.js -p '{"host":"https://site2.enigmabridge.com:11180", "apiKey": "TEST_API", "uoId": "ee01", "aesKey":"e134567890123456789012345678901234567890123456789012345678901234", "macKey":"e224262820223456789012345678901234567890123456789012345678901234", "input":"6bc1bee22e409f96e93d7e117393172a"}'
```

[Enigma Bridge]: https://www.enigmabridge.com