#!/bin/bash

DIR=`dirname $0`

cp ${DIR}/../../google-closure-compiler/compiler.jar $DIR/compiler.jar

$DIR/remove_constants.pl $1 | $DIR/opacify.pl > ._tmpRC.js

echo -n '"use strict";'
java -jar $DIR/compiler.jar --compilation_level ADVANCED_OPTIMIZATIONS \
     --js ._tmpRC.js \
     | $DIR/digitize.pl \
     | $DIR/dewindowize.pl
     

rm -f ._tmpRC.js

