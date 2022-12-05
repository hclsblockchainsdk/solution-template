#!/bin/bash
restartType="$1"
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
NO_CLOUDANT_MAPPING=${1:-"false"}
if [ $NO_CLOUDANT_MAPPING == "no_cloudant_mapping" ]; then
    echo "No cloudant container volume mapping to host. Data will be lost after restart."
    yes | cp $PROJECT_DIR/network_local_HF/docker-compose-e2e-template-no-cloudant-mapping.yaml $PROJECT_DIR/network_local_HF/docker-compose-e2e-template.yaml
    yes | cp $PROJECT_DIR/network_local_HF/docker-compose-e2e-no-cloudant-mapping.yaml $PROJECT_DIR/network_local_HF/docker-compose-e2e.yaml
    yes | cp $PROJECT_DIR/network_local_HF/docker-compose-cli-no-cloudant-mapping.yaml $PROJECT_DIR/network_local_HF/docker-compose-cli.yaml
    yes | cp $PROJECT_DIR/network_local_HF/docker-compose-cloudant-no-mapping.yaml $PROJECT_DIR/network_local_HF/docker-compose-cloudant.yaml
fi

case $restartType in
    server-clean)
    (cd $PROJECT_DIR/scripts; ./cleanup.sh)

    (cd $PROJECT_DIR/scripts; ./deploy_chaincode.sh)

    (cd $PROJECT_DIR/network_local_HF; ./byfn.sh up -f docker-compose-e2e.yaml -y)

    (cd $PROJECT_DIR/server; node server.js)
    ;;
    server)
    (cd $PROJECT_DIR/scripts; ./stop_old_containers.sh)

    (cd $PROJECT_DIR/scripts; ./deploy_chaincode.sh)

    (cd $PROJECT_DIR/server; node server.js)
    exit 0
    ;;
    *)
    (cd $PROJECT_DIR/scripts; ./cleanup.sh)

    (cd $PROJECT_DIR/scripts; ./deploy_chaincode.sh)

    (cd $PROJECT_DIR/server/deploy; go build --tags nopkcs11 ./...)

    (cd $PROJECT_DIR/network_local_HF; ./byfn.sh up -f docker-compose-e2e.yaml -y)

    (cd $PROJECT_DIR; npm run setup)

    (cd $PROJECT_DIR; npm run build)

    (cd $PROJECT_DIR/server; node server.js)
    ;;
esac




