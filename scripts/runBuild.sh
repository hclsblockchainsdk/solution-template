#!/bin/bash

echo Creating new build

npm run build
cd server
node server.js