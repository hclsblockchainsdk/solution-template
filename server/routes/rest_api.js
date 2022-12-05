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

/*
 * GET home page.
 */
// import common api router
var express = require('express');
var router = express.Router();

// solution api handler
var solution_req_handler = require('../solution_api_handler.js');
var req_handler = require('common-utils/request_handler');
var route_login = require('common-utils/routes/route_login');


// Use tags to make logs easier to find
var TAG = "rest_api.js";
var log4js = require('log4js');
var logger = log4js.getLogger(TAG);
logger.level = 'DEBUG';

const invalidDataError = 400;

// ============================================================================================================================
// Home
// ============================================================================================================================

//1. if path is /login or /mfa skip authentication,
//2. check token
//3. if authorization (basic auth) exist in headers, remove token in session
//4. check token in session
//5. check headers
//6. apilogin (require same headers as login) - basic auth first and then headers
router.use(function(req, res, next) { route_login.login(req, res, next); });

//===========================================
// data definitions
//===========================================

/**
 * @swagger
 * definitions:
 *   SolutionLevelRole:
 *     type: string
 *     default: ""
 *   LoginResponse:
 *     properties:
 *       id:
 *         type: string
 *       name:
 *         type: string
 *       secret:
 *         type: string
 *       msg:
 *         type: object
 *         properties:
 *           result:
 *             type: string
 *           error:
 *             type: string
 *       token:
 *         type: string
 *       public_key:
 *         type: string
 *   SignData:
 *     properties:
 *       user_id:
 *         type: string
 *         default: ""
 *       method:
 *         type: string
 *         enum: ["GET", "POST", "PUT"]
 *         default: "GET"
 *       api_path:
 *         type: string
 *         default: "/solution/api/v1/"
 *       sign_key:
 *         type: string
 *         default: ""
 *       sign_algorithm:
 *         type: string
 *         default: "sha256"
 *       payload:
 *         type: object
 *         default: ""
 *       is_proxy:
 *         type: boolean
 *         default: false
 *       encrypt_payload:
 *         type: boolean
 *         default: false
 *   OrgNew:
 *     properties:
 *       id:
 *         type: string
 *         default: "required"
 *       secret:
 *         type: string
 *         default: "optional (required if already registered in CA)"
 *       name:
 *         type: string
 *         default: "required"
 *       ca_org:
 *         type: string
 *         default: "required"
 *       email:
 *         type: string
 *         default: "required"
 *       tax_id:
 *         type: string
 *         default: "required"
 *       address:
 *         type: string
 *         default: "required"
 *       role:
 *         $ref: '#/definitions/SolutionLevelRole'
 *         default: "org"
 *       data:
 *         type: object
 *         default: {}
 *       status:
 *         type: string
 *         default: "active"
 *       public_key:
 *         type: string
 *         default: ""
 *       private_key:
 *         type: string
 *         default: ""
 *       sym_key:
 *         type: string
 *         default: ""
 *       verify_key:
 *         type: string
 *         default: ""
 *   OrgUpdate:
 *     properties:
 *       id:
 *         type: string
 *         default: "required"
 *       name:
 *         type: string
 *         default: "required"
 *       ca_org:
 *         type: string
 *         default: "required"
 *       tax_id:
 *         type: string
 *         default: "required"
 *       address:
 *         type: string
 *         default: "required"
 *       role:
 *         $ref: '#/definitions/SolutionLevelRole'
 *         default: "org"
 *       data:
 *         type: object
 *         default: {}
 *       status:
 *         type: string
 *         default: "active"
 *   Org:
 *     properties:
 *       id:
 *         type: string
 *       name:
 *         type: string
 *       role:
 *         type: string
 *       public_key:
 *         type: string
 *       private_key:
 *         type: string
 *       sym_key:
 *         type: string
 *       IsGroup:
 *         type: boolean
 *       status:
 *         type: string
 *       email:
 *         type: string
 *       kms_public_key_id:
 *         type: string
 *       kms_private_key_id:
 *         type: string
 *       kms_sym_key_id:
 *         type: string
 *       secret:
 *         type: string
 *       data:
 *         type: object
 *   OrgResponse:
 *     properties:
 *       id:
 *         type: string
 *       key_id:
 *         type: object
 *       secret:
 *         type: string
 *       msg:
 *         type: object
 *         properties:
 *           result:
 *             type: string
 *           error:
 *             type: string
 *   UserNew:
 *     properties:
 *       id:
 *         type: string
 *         default: "required"
 *       secret:
 *         type: string
 *         default: "optional (required if already registered in CA)"
 *       name:
 *         type: string
 *         default: "required"
 *       email:
 *         type: string
 *         default: "required"
 *       ca_org:
 *         type: string
 *         default: "required"
 *       role:
 *         $ref: '#/definitions/SolutionLevelRole'
 *       data:
 *         type: object
 *         default: {}
 *       public_key:
 *         type: string
 *         default: ""
 *       private_key:
 *         type: string
 *         default: ""
 *       sym_key:
 *         type: string
 *         default: ""
 *       verify_key:
 *         type: string
 *         default: ""
 *   UserUpdate:
 *     properties:
 *       id:
 *         type: string
 *         default: "required"
 *       name:
 *         type: string
 *         default: "required"
 *       ca_org:
 *         type: string
 *         default: "required"
 *       role:
 *         $ref: '#/definitions/SolutionLevelRole'
 *       data:
 *         type: object
 *         default: {}
 *       status:
 *         type: string
 *         default: "active"
 *   LoginUserUpdate:
 *     properties:
 *       id:
 *         type: string
 *       name:
 *         type: string
 *       password:
 *         type: string
 *       email:
 *         type: string
 *       data:
 *         type: object
 *         default: {}
 *   User:
 *     properties:
 *       id:
 *         type: string
 *       name:
 *         type: string
 *       role:
 *         type: string
 *         enum: ["user", "org", "audit", "system"]
 *         default: "user"
 *       is_group:
 *         type: boolean
 *         default: false
 *       email:
 *         type: string
 *       data:
 *         type: object
 *         default: {}
 *       status:
 *         type: string
 *         default: "active"
 *       public_key:
 *         type: string
 *       private_key:
 *         type: string
 *       sym_key:
 *         type: string
 *       kms_private_key_id:
 *         type: string
 *       kms_public_key_id:
 *         type: string
 *       kms_sym_key_id:
 *         type: string
 *       secret:
 *         type: string
 *   SimpleUser:
 *     properties:
 *       id:
 *         type: string
 *       name:
 *         type: string
 *       role:
 *         type: string
 *         enum: ["user", "org", "audit", "system"]
 *         default: "user"
 *       is_group:
 *         type: boolean
 *         default: false
 *       status:
 *         type: string
 *         default: "active"
 *       public_key:
 *         type: string
 *   UserResponse:
 *     properties:
 *       id:
 *         type: string
 *       key_id:
 *         type: object
 *       secret:
 *         type: string
 *       msg:
 *         type: object
 *         properties:
 *           result:
 *             type: string
 *           error:
 *             type: string
 *       token:
 *         type: string
 *   Log:
 *     properties:
 *       transaction_id:
 *         type: string
 *       namespace:
 *         type: string
 *       function_name:
 *         type: string
 *       caller_id:
 *         type: string
 *       data:
 *         type: object
 *       timestamp:
 *         type: integer
 *         format: int64
 *   Claim:
 *     properties:
 *       claim_id:
 *         type: string
 *       episode:
 *         type: string
 *       payer:
 *         type: string
 *       provider:
 *         type: string
 *       update_date:
 *         type: integer
 *         format: int64
 *       data:
 *         type: object
 *         default: {}
 *   ClaimInput:
 *     properties:
 *       claim_id:
 *         type: string
 *       episode:
 *         type: string
 *       payer:
 *         type: string
 *       provider:
 *         type: string
 *       update_date:
 *         type: string
 *         default: "2020/01/01"
 *       data:
 *         type: object
 *         default: {}
 *   ChainStat:
 *     properties:
 *       height:
 *         type: object
 *         default: {}
 *       currentBlockHash:
 *         type: object
 *         default: {}
 *       previousBlockHash:
 *         type: object
 *         default: {}
 *   BlockStat:
 *     properties:
 *       header:
 *         type: object
 *         default: {}
 *       data:
 *         type: object
 *         default: {}
 *       metaData:
 *         type: object
 *         default: {}
 */


/**
 * @swagger
 * securityDefinitions:
 *   basicAuth:
 *     type: basic
 *     description: HTTP Basic Authentication.
 */

/**
 * @swagger
 * /solution/api/v1/orgs:
 *   post:
 *     tags:
 *       - Solution Organizations
 *     description: "Register a new org"
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         in: header
 *         description: login token
 *         required: false
 *         type: string
 *         format: string
 *       - name: signature
 *         in: header
 *         description: user signature
 *         required: false
 *         type: string
 *         format: string
 *       - name: Org
 *         description: Org Object
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/OrgNew'
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Org registration response object
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/OrgResponse'
 */
router.route('/orgs').post(function(req, res) {
    const verify_signature = req_handler.solutionConfig["verify_user_signature"];
    if (!req.body.id) {
        var errmsg = "id missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.name) {
        var errmsg = "name missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.email) {
        var errmsg = "email missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.status || req.body.status != "active") {
        var errmsg = "status has to be \"active\"";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.tax_id) {
        var errmsg = "tax_id missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.address) {
        var errmsg = "address missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.role) {
        var errmsg = "role missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    }  else if (verify_signature && !req.body.verify_key) {
        var errmsg = "verify key is missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else {
        var data = {
            type: 'registerOrg',
            id: req.body.id,
            secret: req.body.secret,
            ca_org: req.body.ca_org,
            name: req.body.name,
            role: "org",
            email: req.body.email,
            status: req.body.status,
            is_group: true,
            tax_id: req.body.tax_id,
            address: req.body.address,
            solution_level_role: req.body.role,
            data: req.body.data && typeof req.body.data == 'object' ? req.body.data: {},
            public_key: req.body.public_key ? req.body.public_key + "" : "",
            private_key: req.body.private_key ? req.body.private_key + "" : "",
            sym_key: req.body.sym_key ? req.body.sym_key + "" : "",
            verify_key: req.body.verify_key ? req.body.verify_key + "" : "",
            action: "register"
        };
        solution_req_handler.process_api(data, req, res);
    }
});

/**
 * @swagger
 * /solution/api/v1/users:
 *   post:
 *     tags:
 *       - Solution Users
 *     description: "__Use this API to register solution user. Currently user schema is the same as Common register user API's user schema.__ <br>Register a new user<br>Note: Org admin user is registered by Register Org API"
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         in: header
 *         description: login token
 *         required: false
 *         type: string
 *         format: string
 *       - name: signature
 *         in: header
 *         description: user signature
 *         required: false
 *         type: string
 *         format: string
 *       - name: User
 *         description: User Object
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/UserNew'
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: User Registration response object with enroll id and secret
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/UserResponse'
 */
router.route('/users').post(function (req, res) {
    const verify_signature = req_handler.solutionConfig["verify_user_signature"];
    var api_admin = req.session["api-admin"];
    if (!req.body.id) {
        var errmsg = "id missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!/^[a-z0-9]+$/i.test(req.body.id)) {
        var errmsg = "id may only contain alphanumeric characters";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.name) {
        var errmsg = "name missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.email) {
        var errmsg = "email missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.role) {
        var errmsg = "role missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (verify_signature && !req.body.verify_key) {
        var errmsg = "verify key is missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else {
        var data = {
            type: 'registerUser',
            id: req.body.id,
            secret: req.body.secret,
            name: req.body.name,
            role: "user",
            ca_org: req.body.ca_org,
            email: req.body.email,
            status: "active",
            is_group: false,
            solution_level_role: req.body.role,
            data: req.body.data && typeof req.body.data == 'object' ? req.body.data : {},
            public_key: req.body.public_key ? req.body.public_key + "" : "",
            private_key: req.body.private_key ? req.body.private_key + "" : "",
            sym_key: req.body.sym_key ? req.body.sym_key + "" : "",
            verify_key: req.body.verify_key ? req.body.verify_key + "" : "",
            action: "register"
        };
        solution_req_handler.process_api(data, req, res);
    }
});

//===========================================
// Claims
//===========================================

/**
 * @swagger
 * /solution/api/v1/claims:
 *   get:
 *     tags:
 *       - Claims
 *     description: Returns all claims
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         in: header
 *         description: login token
 *         required: false
 *         type: string
 *         format: string
 *       - name: signature
 *         in: header
 *         description: user signature
 *         required: false
 *         type: string
 *         format: string
 *       - name: limit
 *         in: query
 *         description: page size limit
 *         required: false
 *         type: integer
 *         default: 10
 *       - name: last_key
 *         in: query
 *         description: last key of previous page returned by GetClaims
 *         required: false
 *         type: string
 *         default: ""
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: An array of claim objects
 *         schema:
 *           type: array
 *           items:
 *             $ref: '#/definitions/Claim'
 */
router.route('/claims').get(function(req, res) {
    var data = {
        type: 'getClaims'
    };
    solution_req_handler.process_api(data, req, res);
});

/**
 * @swagger
 * /solution/api/v1/claims:
 *   post:
 *     tags:
 *       - Claims
 *     description: "Creates a new claim"
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         in: header
 *         description: login token
 *         required: false
 *         type: string
 *         format: string
 *       - name: signature
 *         in: header
 *         description: user signature
 *         required: false
 *         type: string
 *         format: string
 *       - name: Claim
 *         description: Claim Object
 *         in: body
 *         required: true
 *         schema:
 *           $ref: '#/definitions/ClaimInput'
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Claim Object
 *         schema:
 *           $ref: '#/definitions/Claim'
 */
router.route('/claims').post(function(req, res) {
    if (!req.body.claim_id) {
        var errmsg = "claim_id missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.episode) {
        var errmsg = "episode missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.payer) {
        var errmsg = "payer missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else if (!req.body.provider) {
        var errmsg = "provider missing";
        logger.error(errmsg);
        res.status(invalidDataError).json({ msg: "Invalid data:" + errmsg, status: invalidDataError });
    } else {
        //Can enter timestamp or date (mm/dd/yyyy) 
        var update_date = req.body.update_date;
        if (!update_date) {
            update_date = 0
        } else if (update_date && typeof update_date == 'string') {
            var match = update_date.match(/\D/g);
            if (match != null) {
                var tsdate = new Date(update_date);
                update_date = Math.floor(tsdate.getTime() / 1000);
            }
            else {
                update_date = parseInt(update_date,10);
            }
        }
        
        var data = {
            type: 'addClaim',
            claim_id: req.body.claim_id,
            episode: req.body.episode,
            payer: req.body.payer,
            provider: req.body.provider,
            update_date: update_date,
            data: req.body.data
        };
        solution_req_handler.process_api(data, req, res);
    }
});

/**
 * @swagger
 * /solution/api/v1/claims/{claim_id}:
 *   get:
 *     tags:
 *       - Claims
 *     description: Returns claim details
 *     produces:
 *       - application/json
 *     parameters:
 *       - name: token
 *         in: header
 *         description: login token
 *         required: false
 *         type: string
 *         format: string
 *       - name: signature
 *         in: header
 *         description: user signature
 *         required: false
 *         type: string
 *         format: string
 *       - name: claim_id
 *         description: Claim ID
 *         in: path
 *         required: true
 *         type: string
 *     security:
 *       - basicAuth: []
 *     responses:
 *       200:
 *         description: Claim Object
 *         schema:
 *           $ref: '#/definitions/Claim'
 */
router.route('/claims/:claim_id').get(function (req, res) {
    var data = {
        type: 'getClaim',
        claim_id: req.params.claim_id
    };
    solution_req_handler.process_api(data, req, res);
});


//=============================================
//logs
//=============================================
/**
* @swagger
* /solution/api/v1/history:
*   get:
*     tags:
*       - Logs
*     description: "__This API can be used by AppAdmin or solution users to query on logs created by users registered through the solution level RegisterUser REST API. Not compatible with users registered through the Common level RegisterUser API.__ <br><br>Get transaction logs. All filter parameters are optional."
*     produces:
*       - application/json
*     parameters:
*       - name: token
*         in: header
*         description: login token
*         required: false
*         type: string
*         format: string
*       - name: user
*         description: UserID of user who added the claim
*         in: query
*         required: false
*         type: string
*       - name: episode
*         description: Episode of the claim
*         in: query
*         required: false
*         type: string
*       - name: start_timestamp
*         description: starting timestamp (inclusive). Cull for data uploaded before at specified time.  Can enter timestamp or date (mm/dd/yyyy) 
*         in: query
*         required: false
*         type: integer
*         format: int64
*       - name: end_timestamp
*         description: end timestamp (exclusive). Cull results data uploaded after specified time.  Can enter timestamp or date (mm/dd/yyyy) 
*         in: query
*         required: false
*         type: integer
*         format: int64
*       - name: previous_key
*         description: Value of the last key of the previous logs. It's used for the pagenation.
*         in: query
*         required: false
*         type: string
*       - name: latest_only
*         description: If true, maxNum is ignored and only latest data is returned.  If start and end timestamp are also specified, they will not be ignored.
*         in: query
*         required: false
*         type: string
*         enum: [ "true", "false"]
*         default: "false"
*       - name: maxNum
*         description: Max number of results returned. If start and end timestamps are not specified, then the most recent results are returned.  If 0 is given maxNum will default to 20.
*         in: query
*         required: false
*         type: string
*         default: 20
*     security:
*       - basicAuth: []
*     responses:
*       200:
*         description: List of Log object
*         schema:
*           type: array
*           items:
*             $ref: '#/definitions/Log'
*/
router.route('/history').get(function(req, res) {

    if (!req.query.episode && !req.query.user) {
        var errmsg = "Must provide at least one of user or claim episode";
        logger.error(errmsg);
        res.status(400).json({msg: errmsg, status: 400});
    } else {

        //support date format input for timestamp
        var ts1 = req.query.start_timestamp;
        if (!ts1) {
            ts1 = 0
        } else if (ts1 && typeof ts1 == 'string') {
            var match = ts1.match(/\D/g);
            if (match != null) {
                var tsdate = new Date(ts1);
                ts1 = Math.floor(tsdate.getTime() / 1000);
            }
            else {
                ts1 = parseInt(ts1,10);
            }
        }
        var ts2 = req.query.end_timestamp;
        if (!ts2) {
            ts2 = 0
        } else if (ts2 && typeof ts2 == 'string') {
            var match = ts2.match(/\D/g);
            if (match != null) {
                var tsdate = new Date(ts2);
                ts2 = Math.floor(tsdate.getTime() / 1000);
            }
            else {
                ts2 = parseInt(ts2,10);
            }
        }
        
        var data = {
            type: 'getLogs',
            user: req.query.user || "",
            episode: req.query.episode || "",
            previous_key: req.query.previous_key || "", 
            latest_only: req.query.latest_only || "",
            start_timestamp: ts1 || "",
            end_timestamp: ts2 || "",
            maxNum: req.query.maxNum || ""
        };
            
        solution_req_handler.process_api(data, req, res);
    }

});

module.exports = router;
