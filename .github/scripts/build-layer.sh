#!/bin/bash
mkdir -p lib/nodejs
rm -rf node_modules lib/nodejs/node_modules
npm ci --omit=dev
mv node_modules lib/nodejs/
