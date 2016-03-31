#!/bin/bash
git clone git@github.com:bitwiseshiftleft/sjcl.git sjcl
cd sjcl
./configure --with-bn --with-ecc --with-codecBytes --with-ctr
make
cd sjcl.js ../
