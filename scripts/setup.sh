#!/bin/bash

echo Building NodeJS Code...

echo Building Root App NodeJS Code
npm install
#cd server/utils
cd common/utils
npm link
cd ../..
#echo Running npm link on chain-utils package
echo Running npm link on common-utils package
#npm link chain-utils
npm link common-utils
npm link jsonschema

echo Done.