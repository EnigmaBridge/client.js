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

function ebGenNonce(length){
    var nonce = "";
    var alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
    var alphabetLen = alphabet.length;
    var i = 0;

    for(i = 0; i < length; i++){
        nonce += alphabet.charAt(Math.floor(Math.random() * alphabetLen));
    }

    return nonce;
}