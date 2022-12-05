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

'use strict';

// For logging
var TAG = 'solution_chaincode_ops:';
var log4js = require('log4js');
var logger = log4js.getLogger(TAG);
var util = require('util');
var hfc = require('fabric-client');
var chaincodeOps = require('common-utils/chaincode_ops');

var log_level = hfc.getConfigSetting('log_level') ? hfc.getConfigSetting('log_level') : "INFO";
logger.level = log_level;

/**
 * Register a org
 * @param caller The user submitting the transaction.
 * @param orgInfo JSON
 */
module.exports.registerOrg = registerOrg;
function registerOrg(caller, orgInfo, cb) {
    logger.debug('Register org:', orgInfo.id);

    var makeCallerAdmin = "false";
    var args = [];

    var orgInfoStr = "";
    try {
        orgInfoStr = JSON.stringify(orgInfo);
    } catch (err) {
        var errmsg = "Invalid org info";
        logger.error(errmsg, err);
        cb && cb(new Error(errmsg));
        return;
    }

    args.push(orgInfoStr, makeCallerAdmin);

    var fcn = "registerOrg";

    if (orgInfo.role !== "org"){
        cb && cb(new Error('Invalid org role: '+orgInfo.role));
    } else {
        chaincodeOps._invoke(caller, fcn, args, function(err, result) {
            if(err) {
                var errmsg = "Failed to register org";
                logger.error(errmsg, err);
                try {
                    cb && cb(new Error(errmsg));
                } catch(err) {
                    logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
                }
            }
            else {
                logger.debug('Registered org successfully');
                try {
                    cb && cb(null, result);
                } catch(err) {
                    logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
                }
            }
        });
    }
}

/**
 * Get an org
 * @param caller The user submitting the transaction.
 * @param orgId Id of org
 */
module.exports.getOrg = getOrg;
function getOrg(caller, orgId, cb) {
    logger.debug('get org:');

    let fcn = 'getOrg';
    let args = [orgId];

    chaincodeOps._query(caller, fcn, args, function (err, value) {
        if (err) {
            var errmsg = "failed to get org:";
            logger.error(errmsg, err);
            try {
                cb && cb(new Error(errmsg));
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        } else {
            logger.debug('got org successfully:', value);
            try {
                cb && cb(null, value);
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        }
    });
}

/**
 * Register a user
 * @param caller The user submitting the transaction.
 * @param userInfo JSON
 */
module.exports.registerUser = registerUser;
function registerUser(caller, userInfo, cb) {
    logger.debug('Register user', userInfo.id);

    var giveAccessToCaller = "false";
    var args = [];

    var userInfoStr = "";
    try {
        userInfoStr = JSON.stringify(userInfo);
    } catch (err) {
        var errmsg = "Invalid user info";
        logger.error(errmsg, err);
        cb && cb(new Error(errmsg));
        return;
    }

    var fcn = "";
    if (userInfo.role === chaincodeOps.roles.USER) {
        fcn = "registerSolutionUser";
        // Give access to caller for solution use case
        giveAccessToCaller = "true";
    } else if (userInfo.role === chaincodeOps.roles.SYSTEM) {
        fcn = "registerSystemAdmin";
    } else if (userInfo.role === chaincodeOps.roles.AUDIT) {
        fcn = "registerAuditor";
    } else if (userInfo.role === chaincodeOps.roles.ORG) {
        fcn = "registerOrgAdmin";
    }
    args.push(userInfoStr, giveAccessToCaller);
    if (fcn === ""){
        cb && cb(new Error('Invalid user role: '+userInfo.role));
    } else {
        chaincodeOps._invoke(caller, fcn, args, function(err, result) {
            if(err) {
                var errmsg = "Failed to register solution user";
                logger.error(errmsg, err);
                try {
                    cb && cb(new Error(errmsg));
                } catch(err) {
                    logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
                }
            }
            else {
                logger.debug('Register Solution User succeeded');
                try {
                    cb && cb(null, result);
                } catch(err) {
                    logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
                }
            }
        });
    }
}

/**
 * Add claim
 * @param caller The user submitting the transaction.
 * @param userInfo JSON
 */
module.exports.addClaim = addClaim;
function addClaim(caller, claimData, cb) {
    logger.debug('Add claim:', claimData);

    var claimDataStr = "";
    try {
        claimDataStr = JSON.stringify(claimData);
    } catch (err) {
        var errmsg = "Invalid claim data";
        logger.error(errmsg, err);
        cb && cb(new Error(errmsg));
        return;
    }

    var fcn = "addClaim";
    var args = [claimDataStr];

    chaincodeOps._invoke(caller, fcn, args, function(err, result) {
        if(err) {
            var errmsg = "Failed to add claim";
            logger.error(errmsg, err);
            try {
                cb && cb(err);
            } catch(err) {
                logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
            }
        }
        else {
            logger.debug('Added claim successfully:', result);
            try {
                cb && cb(null, result);
            } catch(err) {
                logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
                throw(err);
            }
        }
    });

}


/**
 * Get claims
 * @param caller The user submitting the transaction.
 */
module.exports.getClaims = getClaims;
function getClaims(caller, limit, lastKey, cb) {
    logger.debug('getClaims');
    let fcn = 'getClaims';
    let args = ['' + limit, lastKey];
    logger.debug('args: ', args);

    chaincodeOps._query(caller, fcn, args, function(err, result) {
        if (err) {
            var errmsg = "Failed to get claims";
            logger.error(errmsg, err);
            try {
                cb && cb(new Error(errmsg));
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        } else {
            logger.debug('got claims successfully:', result);
            try {
                cb && cb(null, result);
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        }
    });
}

/**
 * Get claim
 * @param caller The user submitting the transaction.
 */
module.exports.getClaim = getClaim;
function getClaim(caller, claimID, cb) {
    logger.debug('getClaim');
    let fcn = 'getClaim';
    let args = [claimID];
    logger.debug('args: ', args);

    chaincodeOps._query(caller, fcn, args, function(err, result) {
        if (err) {
            var errmsg = "Failed to get claim";
            logger.error(errmsg, err);
            try {
                cb && cb(new Error(errmsg));
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        } else {
            logger.debug('got claim successfully:', result);
            try {
                cb && cb(null, result);
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        }
    });
}


/**
 * Get logs
 * @param caller The user submitting the transaction.
 */
module.exports.getLogs = getLogs;
function getLogs(caller, user, claimEpisode, startTimestamp, endTimestamp, prevValue, latestOnly, maxNum, cb) {
    logger.debug('getLogs');
    let fcn = 'getLogs';
    let args = [user, claimEpisode, ''+startTimestamp, ''+endTimestamp, prevValue, ''+latestOnly, ''+maxNum];
    logger.debug('args: ', args);

    chaincodeOps._query(caller, fcn, args, function(err, result) {
        if (err) {
            var errmsg = "Failed to get claims";
            logger.error(errmsg, err);
            try {
                cb && cb(new Error(errmsg));
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        } else {
            logger.debug('got claims successfully:', result);
            try {
                cb && cb(null, result);
            } catch (err) {
                logger.error(util.format("callback for " + fcn + " failed: error: %s", err));
            }
        }
    });
}


/**
 * Invoke test
 * @param caller The user submitting the transaction.
 */
module.exports.invokeTest = invokeTest;
function invokeTest(caller, cb) {
    logger.debug('invoke test:');

    let fcn = 'invokeTest';
    let args = [caller.id, caller.secret];

    chaincodeOps._invoke(caller, fcn, args, function(err, result) {
        if(err) {
            var errmsg = "Failed invoke test";
            logger.error(errmsg, err);
            cb && cb(new Error(errmsg));
        }
        else {
            logger.debug('invoke test successful:', result);
            cb && cb(null, result);
        }
    });
}

/**
 * Query test
 * @param caller The user submitting the transaction.
 */
module.exports.queryTest = queryTest;
function queryTest(caller, cb) {
    logger.debug('query test');

    let fcn = 'queryTest';
    let args = [caller.id, caller.secret];

    chaincodeOps._query(caller, fcn, args, function(err, value) {
        if(err) {
            var errmsg = "Failed query test";
            logger.error(errmsg, err);
            cb && cb(new Error(errmsg));
        }
        else {
            logger.debug('query test successful:', value);
            cb && cb(null, value);
        }
    });
}
