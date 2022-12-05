#!/bin/bash
echo Stop old chaincode container:

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"

echo PROJECT_DIR=$PROJECT_DIR

echo Stop old containers...

docker stop $(docker ps | grep dev-peer* | cut -d' ' -f1)

echo Done.

echo Remove old containers 

docker stop $(docker ps | grep dev-peer* | cut -d' ' -f1)

echo Done.

echo Stop container complete.