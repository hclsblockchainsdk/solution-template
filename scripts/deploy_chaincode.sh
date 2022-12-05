#!/bin/bash
echo -------------------------
echo deploy chaincode
# ./deploy_chaincode.sh -i true
while echo $1 | grep -q ^-; do
    eval $( echo $1 | sed 's/^-//' )=$2
    shift
    shift
done

interactive=${i}

PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
SRC_DIR="$PROJECT_DIR/chaincodes/src"
DEPLOY_DIR="$PROJECT_DIR/chaincodes/deploy"
echo PROJECT_DIR=$PROJECT_DIR
echo SRC_DIR=$SRC_DIR
echo DEPLOY_DIR=$DEPLOY_DIR
echo -------------------------

#delete and create deploy directory
echo deleting $DEPLOY_DIR
rm -rf $DEPLOY_DIR
echo creating $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

for ccpath in $SRC_DIR/*; do
    DEST_DIR="$DEPLOY_DIR/$(basename $ccpath)"
    DEST_VENDOR="$DEST_DIR/vendor"
    echo copy $ccpath to deploy dir
    cp -rf $ccpath $DEST_DIR
    
    #crete chaincode dir in vendor
    echo creat dir $DEST_VENDOR/$(basename $ccpath)
    mkdir -p $DEST_VENDOR/$(basename $ccpath)
    
    #move chaincode dir to vendor
    for f in $DEST_DIR/*; do
        #skip files & vendor
        fname=$(basename $f)
        #echo processing $fname
        #skip file and vendor directory
        if [ -f $f ] || [ "$f" = "$DEST_VENDOR" ]
        then
            continue
        else
            #move to vendor directory
            echo move $f to $DEST_VENDOR/$(basename $ccpath)
            mv $f $DEST_VENDOR/$(basename $ccpath)
        fi
    done
    
    for f1 in $(find $DEST_VENDOR -type d -name "vendor"); do
        if [ "$f1" != "$DEST_VENDOR" ]
        then
            echo move $f1 to top vendor dir
            cp -rn $f1 $DEST_DIR
            rm -rf $f1
        fi
    done
done


echo Done.
if [ "$interactive" == "true" ]
then
    read -p "Press any key to close... " -n1 -s
fi

