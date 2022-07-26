#!/bin/bash
git submodule update --init

cd vite-ts-path-with-multy-index-support
npm i
npm run build-lib
cd ..

npm i blitz@alpha -g
npm i
export DATABASE_URL="file:./db.sqlite"
export SESSION_SECRET_KEY="uiwefgukewagfgeawfcugewiuahfgeiuafguyaiwrfhawoehfigyvb"