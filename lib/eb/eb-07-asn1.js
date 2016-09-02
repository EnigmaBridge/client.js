eb.comm.asn1decoder = function(options){
    this.logger = options.logger;
};
eb.comm.asn1decoder.prototype = {
    llog: function(lvl, msg){
        if (this.logger){
            this.logger("|" + ("--".repeat(lvl)) + msg);
        }
    },
    parse: function(buffer, lvl) {
        var w = sjcl.bitArray;
        var result = {};
        var position = 0;
        this.llog(lvl, "Parsing: " + sjcl.codec.hex.fromBits(buffer));

        result.cls = getClass();
        result.structured = getStructured();
        result.tag = getTag();
        var length = getLength(); // As encoded, which may be special value 0

        if (length === 0x80) {
            length = 0;
            while (getByte(position + length) !== 0 || getByte(position + length + 1) !== 0) {
                length += 1;
            }
            result.byteLength = position + length + 2;
            result.contents = w.bitSlice(buffer, 8*position, 8*(position + length));
        } else {
            result.byteLength = position + length;
            result.contents = w.bitSlice(buffer, 8*position, 8*(result.byteLength));
        }

        var doProcess = result.structured;

        // BIT-STRING?
        if (result.cls == 0 && result.tag == 3){
            doProcess = true;
            var unusedBits = w.extract(buffer, 8*position, 8);
            result.contents = w.bitSlice(buffer, 8*(position+1), 8*(result.byteLength)-unusedBits);
        }

        result.clen = w.bitLength(result.contents)/8;
        result.sub = [];
        this.llog(lvl, sprintf("Cur: tag: %02d, cls: %02d, struct: %d, len: %04d", result.tag, result.cls, result.structured, result.clen));

        if (doProcess){
            var subElem = undefined, subContent = result.contents, idx=0;
            do {
                this.llog(lvl, "Parsing sub: " + idx);
                subElem = this.parse(subContent, lvl === undefined ? 1 : lvl+1);
                if (subElem) {
                    result.sub.push(subElem);
                } else {
                    break;
                }

                if (subElem.byteLength !== undefined) {
                    subContent = w.bitSlice(subContent, 8*subElem.byteLength);
                    this.llog(lvl, "Bytes left: " + (w.bitLength(subContent)/8));
                }
                idx += 1;
            } while(subElem && w.bitLength(subContent) > 0);
        }

        return result;

        // Function for recursive calls - keeps context.
        function getByte(offset){
            return w.extract(buffer, offset * 8, 8);
        }

        function getClass() {
            return (getByte(position) & 0xc0) / 64;
        }

        function getStructured() {
            return ((getByte(position)) & 0x20) === 0x20;
        }

        function getTag() {
            var tag = getByte(0) & 0x1f;
            position += 1;
            if (tag === 0x1f) {
                tag = 0;
                while (getByte[position] >= 0x80) {
                    tag = tag * 128 + getByte(position) - 0x80;
                    position += 1;
                }
                tag = tag * 128 + getByte(position) - 0x80;
                position += 1;
            }
            return tag;
        }

        function getLength() {
            var length = 0;

            if (getByte(position) < 0x80) {
                length = getByte(position);
                position += 1;
            } else {
                var numberOfDigits = getByte(position) & 0x7f;
                position += 1;
                length = 0;
                for (var i = 0; i < numberOfDigits; i++) {
                    length = length * 256 + getByte(position);
                    position += 1;
                }
            }
            return length;
        }
    }
};
