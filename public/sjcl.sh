#!/bin/bash
git clone git@github.com:bitwiseshiftleft/sjcl.git sjcl
cd sjcl
./configure --with-codecBase32 --with-bn --with-codecBase32 --with-codecBytes --with-ctr --with-sha1
make
cd sjcl.js ../
