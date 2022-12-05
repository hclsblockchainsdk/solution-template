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

// Solution template specific api handler
var solutionChaincodeOps = require('./solution_chaincode_ops.js');
var chaincodeOps = require('common-utils/chaincode_ops.js');
var log4js = require('log4js');
var logger = log4js.getLogger('solution_api_handler.js');
var user_manager = require('common-utils/user_manager');
var hfc = require('fabric-client');

var log_level = hfc.getConfigSetting('log_level') ? hfc.getConfigSetting('log_level') : "INFO";
logger.level = log_level;

const invalidDataError = 400;
const unauthorizedError = 401;
const serverError = 500;

// There is a default register org service in common services. In this solution
// services, a solution register org service is created to showcase how solution
// creates its own customized services different from common services.

function convertErrorFromJson(err) {
    try {
        let jsonError = JSON.parse(err.message);
        return { msg: jsonError.message, status: jsonError.status };
    } catch (err2) {
        //JSON.parseFails we ignore and send regular error
    }
    let statusCode = err.message.startsWith('Invalid') ? invalidDataError : serverError;
    return { msg: err.message, status: statusCode }

}

function getClaimsApiHandler(caller, data, req, res) {
    logger.debug('getClaims');
    limit = 10;
    lastKey = "";
    if (req.query.limit) {
        limit = req.query.limit;
    }
    if (req.query.last_key) {
        lastKey = req.query.last_key;
        // Escaped unicode characters (e.g. \u0000, which separates ledger key fields) need to be unescaped
        if (req.query.last_key.indexOf('\\u') > -1) {
            lastKey = decodeURIComponent(JSON.parse('"' + req.query.last_key.replace('"', '\\"') + '"'));
        }
    }
    solutionChaincodeOps.getClaims(caller, limit, lastKey, function (err, result) {
        if (err != null) {
            logger.error(err);
            res.json([]);
        } else {
            res.json(result);
        }
    });
}

function getClaimApiHandler(caller, data, req, res) {
    logger.debug('getClaim');
    solutionChaincodeOps.getClaim(caller, data.claim_id, function (err, result) {
        if (err != null) {
            logger.error(err);
            res.json({});
        } else {
            res.json(result);
        }
    });
}

function addClaimApiHandler(caller, data, req, res) {
    logger.debug('addClaim');

    let claim = {
        claim_id: data.claim_id,
        episode: data.episode,
        payer: data.payer,
        provider: data.provider,
        update_date: data.update_date,
        data: data.data
    };
    solutionChaincodeOps.addClaim(caller, claim, function(err, result) {
        if (err != null) {
            var errmsg = "addClaim error";
            logger.error(errmsg, err);
            let statusAndMsg = convertErrorFromJson(err);
            res.status(statusAndMsg.status).json({ 'msg': statusAndMsg.msg });
        } else {
            //this tx doesn't return data
            delete result.data;
            res.status(201).json(Object.assign(result, { tx_id: result.tx_id, Location: `${req.originalUrl}/${data.claim_id}` }));
        }
    });
}

function registerUser(caller, data, req, res) {
    logger.debug('registerUser');

    //check user permission here
    //system can register system, auditor, org, patient
    //org can register service, patient
    //service can register patient
    //patient can self register

    var failIfExist = !caller.id;
    try {
        // 1. register user (CA) & enroll
        user_manager.registerUser(data.id, data.secret, data.role, data.ca_org, data.email, data.verify_key, data.private_key, data.public_key, data.sym_key, failIfExist).then(([newUser, enrollment, attrList]) => {
            // 2. register user in chaincode
            var is_group = data.is_group === "true" || data.is_group === true;
            var solution_private_data = data.data;
            var solution_public_data = {
                solution_level_role: data.solution_level_role,
            };
            data.secret = newUser._enrollmentSecret;
            var userInfo = {
                id: data.id,
                name: data.name,
                role: data.role,
                is_group: is_group,
                status: data.status,
                email: data.email,
                secret: data.secret,
                solution_public_data: solution_public_data,
                solution_private_data: solution_private_data
            };

            //keys
            for (let i = 0; i < attrList.length; i++) {
                let attr = attrList[i];
                if (attr["name"] === "prvkey") {
                    userInfo["private_key"] = attr["value"];
                } else if (attr["name"] === "pubkey") {
                    userInfo["public_key"] = attr["value"];
                } else if (attr["name"] === "symkey") {
                    userInfo["sym_key"] = attr["value"];
                }
            }


            solutionChaincodeOps.registerUser(caller, userInfo, function (err, result) {
                if (err != null) {
                    var errmsg = "User is registered to CA, but failed to update user (CC):" + err.message;
                    logger.error(errmsg);
                    res.status(serverError).json({ msg: errmsg, status: serverError });
                } else {
                    logger.info('user registration completed successfully');
                    res.status(201).json({
                        id: data.id,
                        secret: data.secret,
                        msg: 'user registration completed successfully',
                        tx_id: result.tx_id
                    });
                }
            });


        }).catch((err) => {
            var errmsg = "Failed to register user (CA):" + err.message;
            logger.error(errmsg, err);
            res.status(serverError).json({ msg: errmsg, status: serverError });
        });

    } catch (err) {
        var errmsg = "Failed to register user";
        logger.error(errmsg, err);
        res.status(serverError).json({ msg: errmsg, status: serverError });
    }
}

function registerUserApiHandler(caller, data, req, res) {
    logger.debug('register user');

    chaincodeOps.getUser(caller, caller.id, function (err, callerData) {
        if (err == null && callerData) {
            chaincodeOps.getUser(caller, data.id, function (err, user) {
                if (err == null && user) {
                    var errmsg = "User " + data.id + " already exists";
                    logger.error(errmsg, err);
                    res.status(invalidDataError).json({ msg: errmsg, status: invalidDataError });
                } else {
                    logger.debug("Existing User not found: ", data.id);
                    caller.role = callerData.role;
                    registerUser(caller, data, req, res);
                }
            });
        } else {
            var errmsg = "Caller " + caller.id + " not found";
            logger.error(errmsg, err);
            res.status(invalidDataError).json({ msg: errmsg, status: invalidDataError});
        }
    });
}

function registerOrg(caller, data, req, res) {
    logger.debug('registerOrg');
    logger.debug(data);

    var failIfExist = caller.id ? false : true;
    try {
        // 1. register user (CA) & enroll
        user_manager.registerUser(data.id, data.secret, data.role, data.ca_org, null, data.verify_key, data.private_key, data.public_key, data.sym_key, failIfExist).then(([newUser, enrollment, attrList]) => {
            // 2. register user in chaincode
            var is_group = data.is_group == "true" || data.is_group == true
            var solution_private_data = data.data;
            solution_private_data.tax_id = data.tax_id;
            solution_private_data.address = data.address;
            var solution_public_data = {
                solution_level_role: data.solution_level_role,
            }
            data.secret = newUser._enrollmentSecret;
            var userInfo = {
                id: data.id,
                name: data.name,
                role: data.role,
                is_group: is_group,
                status: data.status,
                email: data.email,
                secret: data.secret,
                solution_public_data: solution_public_data,
                solution_private_data: solution_private_data
            };

            //keys
            for (let i = 0; i < attrList.length; i++) {
                let attr = attrList[i];
                if (attr["name"] == "prvkey") {
                    userInfo["private_key"] = attr["value"];
                } else if (attr["name"] == "pubkey") {
                    userInfo["public_key"] = attr["value"];
                } else if (attr["name"] == "symkey") {
                    userInfo["sym_key"] = attr["value"];
                }
            }


            solutionChaincodeOps.registerOrg(caller, userInfo, function(err, result) {
                if (err != null) {
                    var errmsg = "Org is registered to CA, but failed to update org (CC):" + err.message;
                    logger.error(errmsg);
                    res.status(500).json({ msg: errmsg, status: 500 });
                } else {
                    logger.debug('org (CC) registered successfully:', result);
                    logger.info('org registration completed successfully');
                    res.json({
                        id: data.id,
                        secret: data.secret,
                        msg: "org registration completed successfully",
                        tx_id: result.tx_id
                    });
                }
            });


        }).catch((err) => {
            var errmsg = "Failed to register org (CA):" + err.message;
            logger.error(errmsg, err);
            res.status(500).res.json({ msg: errmsg, status: 500 });
        });

    } catch (err) {
        var errmsg = "Failed to register org";
        logger.error(errmsg, err);
        res.status(500).json({ msg: errmsg, status: 500 });
    }

}


function registerOrgApiHandler(caller, data, req, res) {
    logger.debug('register org');

    solutionChaincodeOps.getOrg(caller, data.id, function(err, user) {
        if (err == null && user) {
            var errmsg = "Existing org with same id found";
            logger.error(errmsg, err);
            res.status(400).json({ msg: errmsg, status: 400 });
        } else {
            logger.debug("Existing org not found: ", data.id);
            registerOrg(caller, data, req, res);
        }
    });
}


function getLogsApiHandler(caller, data, req, res) {
    logger.debug('getLogs');
    //claimEpisode, startTimestamp, endTimestamp, prevValue, latestOnly, maxNum

    logger.debug('getLogs');
    if (!data.user) {
        data.user = "";
    }
    if (!data.episode) {
        data.episode = "";
    }
    if (!data.start_timestamp) {
        data.start_timestamp = "0";
    }
    if (!data.end_timestamp) {
        data.end_timestamp = "0";
    }
    if (!data.prev_key) {
        data.prev_key = "";
    }
    if (!data.latest_only) {
        data.latest_only = "false"
    }
    if (!data.maxNum) {
        data.maxNum = "1000"
    }
    solutionChaincodeOps.getLogs(caller, data.user, data.episode, data.start_timestamp + '', data.end_timestamp + '', data.prev_key,  data.latest_only + '', data.maxNum + '', function (err, logs) {
        if (err != null) {
            logger.error(err);
            res.json([]);
        }
        else {
            res.json(logs);
        }
    });

}


module.exports.process_api = process_api;
function process_api(data, req, res) {
    logger.debug('received api:', data.type);
    var enrollId = req.headers["enroll-id"];
    var enrollSecret = req.headers["enroll-secret"];
    var org = req.headers["ca-org"];
    var channel = req.headers["channel"];
    var caller = {
        id: enrollId,
        secret: enrollSecret,
        org: org,
        channel: channel
    };
    try {
        //org
        if (data.type === 'registerOrg') {
            registerOrgApiHandler(caller, data, req, res);
        }

        //user
        else if (data.type === 'registerUser') {
            registerUserApiHandler(caller, data, req, res);
        }

        // claims
        else if (data.type === 'getClaims') {
            getClaimsApiHandler(caller, data, req, res);
        } else if (data.type === 'addClaim') {
            addClaimApiHandler(caller, data, req, res);
        } else if (data.type === 'getClaim') {
            getClaimApiHandler(caller, data, req, res);
        }

        // logs
        else if (data.type === 'getLogs') {
            getLogsApiHandler(caller, data, req, res);
        }

        // error
        else {
            let errmsg = "Unknown API end point";
            logger.error(errmsg, data.type);
            res.status(404).json({ msg: errmsg + req.path, status: 404 });
        }
    } catch (err) {
        let errmsg = "process api error";
        logger.error(errmsg, err);
        res.status(500).json({ msg: errmsg, status: 500 });
    }
}