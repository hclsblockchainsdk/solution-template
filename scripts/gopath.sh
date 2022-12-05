#!/bin/bash

echo Setting GOPath
echo Current GOPATH=$GOPATH
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
SRC_DIR="$PROJECT_DIR/chaincodes"
export GOPATH=$GOPATH:$SRC_DIR
echo New GOPATH=$GOPATH