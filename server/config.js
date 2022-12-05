/*******************************************************************************
 * IBM Confidential
 * 
 * OCO Source Materials
 * 
 * Copyright IBM Corp. 2019, 2020
 * 
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U.S. Copyright Office.
 *******************************************************************************/

var path = require('path');
var hfc = require('fabric-client');

var config_file = path.join(__dirname, 'config','local_HF','config.json');
hfc.addConfigFile(config_file);

process.env.config_file = config_file;

/* 
 
 Define configurations in config_file specified above.
 All file path in the config_file is relative to the solution's top level folder.
 
 
{
    "host": "localhost",
    "port": "3000",
    "enable_https": false,
    "swagger_host": "localhost:3000",
    "dev_mode": false,
    "log_level": "DEBUG",
    "chaincode_src_path": "./chaincodes/src",
    "chaincode_deploy_path": "./chaincodes/deploy",
    "channel_config": {
        "mychannel": {
            "config_path": "./network_local_HF/channel-artifacts/channel.tx",
            "create_channel": false
        }
    },
    "tmp_dir": "../tmp",
    "sessionMaxAge": "1800000",
    "channel_creation_wait_time": "5000",
    "chaincode_upate_wait_time": "30000",
    "instantiateProposalTimeout": "180000",
    "eventWaitTime": "60000",
    "transactionProposalTimeout": "60000",
    "login_token_timeout_sec": "1800",
    "kms_module": "kms_local.js",
    "ums_module": "ums_ca.js",
    "network_config_file": "./server/config/local_HF/network-config.yaml",
    "solution_config_file": "./server/config/local_HF/solutions.yaml",
    "key_value_store_module": "./common/utils/NoKeyValueStore.js",
    "query_option": {
        "number_of_peers_to_send_query": 1,
        "use_non_endorsing_peers_first": true
    },
    "hyperledger_fabric_version": "1.4",
    "endorsement_policy": "AND",
    "app_id_config_file": "./server/config/application-id-integration.json"
}
 
 
 if key_value_store_module starts with ".", it will be relative to the solution's top level directory.
 Default value for the key_value_store_module is "fabric-client/lib/impl/FileKeyValueStore.js".
 If you want to disable key value store, use "./common/utils/NoKeyValueStore.js".
 You can implement your own key value store by extending api.KeyValueStore.
  
 */

if ( 
        !hfc.getConfigSetting('host')||
        !hfc.getConfigSetting('port') ||
        !hfc.getConfigSetting('swagger_host') ||
        !hfc.getConfigSetting('kms_module') ||
        !hfc.getConfigSetting('ums_module') ||
        !hfc.getConfigSetting('network_config_file') ||
        !hfc.getConfigSetting('solution_config_file') ||
        !hfc.getConfigSetting('key_value_store_module') 
    ) {
    throw new Error('Missing config item in config.js');
}
