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
/*
 * config.js is the wrapper for the main configuration files for the app
 * It identifies two main configuration files within ./config folder:
 * config.json - app level configurations
 * network-config.json - chaincode network configuration
 * 
 * 
 */
 
var ip = require('ip');

// =====================================================================================================================
//                                                 Defauklt Cloudant Setup
// =====================================================================================================================
// Setting up default cloudant env variables values
// Modify these values to you own instnce if you want to connect to your instance
// Or set environment variables in your system
if (!process.env.CLOUDANT_USERNAME || process.env.CLOUDANT_USERNAME == 'undefined') {
    process.env.CLOUDANT_USERNAME = "admin";
}
if (!process.env.CLOUDANT_PASSWORD || process.env.CLOUDANT_PASSWORD == 'undefined') {
    process.env.CLOUDANT_PASSWORD = "pass";
}
if (!process.env.CLOUDANT_DATABASE || process.env.CLOUDANT_DATABASE == 'undefined') {
    process.env.CLOUDANT_DATABASE = "claim";
}
if (!process.env.CLOUDANT_HOST || process.env.CLOUDANT_HOST == 'undefined') {
    process.env.CLOUDANT_HOST = "http://"+ ip.address()+":9080";
}
    
//For logging
var TAG = 'server.js:';
var log4js = require('log4js');
var logger = log4js.getLogger(TAG);

// =====================================================================================================================
//                                                 Node.js Setup
// =====================================================================================================================
var express = require('express');
var app = express();
//var session = require('express-session');
var session = require('cookie-session');
var compression = require('compression');
var swaggerJSDoc = require('swagger-jsdoc');
var serve_static = require('serve-static');
var path = require('path');
var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var http = require('http');
var https = require('https');
var url = require('url');
var cors = require('cors');
var fs = require('fs');
require('./config.js');
var hfc = require('fabric-client');
var swaggerUI = require('swagger-ui-express');
var swaggerFilter = require('./swagger_filter.js');

// Things that require the network to be set up
var chain_helper = require('common-utils/chain_helper');
var user_manager = require('common-utils/user_manager');
var kms = require('common-utils/kms');
var ums = require('common-utils/ums');
var swagger_common_option = "../node_modules/common-utils/routes/common_rest_api.js";

var log_level = hfc.getConfigSetting('log_level') ? hfc.getConfigSetting('log_level') : "INFO";
logger.level = log_level;
logger.info("Setting LOGLEVE to ", log_level);

logger.info('------------------------------------------------');
logger.info(' SERVER INIT' );
logger.info('------------------------------------------------');

//Fix for the SDK.  Need to make sure a `/tmp` directory exists to tarball chaincode
//TODO: check if this is neede for v1.0
try {
    if (!fs.existsSync('/tmp')) {
        logger.info('No /tmp directory. Creating /tmp directory');
        fs.mkdirSync('/tmp');
    }
} catch (err) {
    logger.error('Error creating /tmp directory for chaincode:', err);
}

// crate tmp
var appTmpDir = hfc.getConfigSetting('tmp_dir');
try {
    if (!fs.existsSync(appTmpDir)) {
        logger.info('No tmp directory. Creating tmp directory');
        fs.mkdirSync(appTmpDir);
    }
} catch (err) {
    logger.error('Error creating tmp directory for chaincode:', err);
}

// initialize util libraries
logger.info("Initialize util libraries");
kms.setup();
ums.setup();
user_manager.setup();
chain_helper.setup();

//=====================================================================================================================
//                                                SWAGGER Setup
//=====================================================================================================================
logger.info('Configuring Swagger');
//swagger definition
var swagger_host = hfc.getConfigSetting('swagger_host');
logger.info("swagger_host : "+swagger_host);
var swaggerDefinition = {
    info: {
        title: 'Open HealthCare-LifeScience Blockchain SDK: solution_template API',
        version: '1.0.0',
        description: 'RESTful APIs for the Open HealthCare-LifeScience Blockchain SDK solution_template',
    },
    host: swagger_host,
    basePath: '/',
};

var defaultSolutionConfig= chain_helper.solutionConfig();
var swaggerApiDocs = [];
for (let solutionName in defaultSolutionConfig["solutions"]) {
    logger.info("Setting Router for Solution: " + solutionName);
    let solutionConfig = defaultSolutionConfig["solutions"][solutionName];
    // add solution api routes to swagger
    let rest_api_routes = solutionConfig["rest_api_routes"];
    swaggerApiDocs.push(rest_api_routes);
}
swaggerApiDocs.push(swagger_common_option);
logger.info("Swagger API Docs:", swaggerApiDocs);

// options for the swagger docs
let options = {
    // import swaggerDefinitions
    swaggerDefinition: swaggerDefinition,
    // path to the API docs
    apis: swaggerApiDocs
};

// initialize swagger-jsdoc
var hiddenSwaggerTags = ['Organizations', 'Users', 'MFA', 'Network Connection Profile'];
var swaggerSpec = swaggerFilter.filter(swaggerJSDoc(options), hiddenSwaggerTags);

//serve swagger
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
//=====================================================================================================================
//                                                Express Setup
//=====================================================================================================================
logger.info('Configuring Express app');
app.use(compression());
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

// static folders
app.use(express.static('../build'));
app.use(express.static('../build/stylesheets/'));

var maxAge = parseInt(hfc.getConfigSetting('sessionMaxAge'));
logger.info('Session MaxAge: ', maxAge);
app.use(session({
	secret : 'Somethignsomething1234!test',
    maxAge: maxAge,
    cookie: {
        httpOnly: true,
        secure: true
    }
}));


// verify CORS access control decisions by a whitelist
var whitelist = [];
var corsOptionsDelegate = function (req, callback) {
	let originHeader = req.header('Origin');
	let hostHeader = req.header('Host');
	if (typeof originHeader === "undefined") { // same-origin
		callback(null, { origin: true })
	} else if (url.parse(originHeader).host === hostHeader) { // same-origin
		callback(null, { origin: true })
	} else if (whitelist.indexOf(originHeader) !== -1) { // cross-origin whitelisted domain
		callback(null, { origin: true })
	} else { // cross-origin forbidden domain
		callback(new Error('Not allowed by CORS'), { origin: false })
	}
};

app.options('*', cors(corsOptionsDelegate));
app.use(cors(corsOptionsDelegate));

// passing information back to the client
app.use(function(req, res, next) {
    logger.info('------------------------------------------------');
    logger.info(' Incoming Request: ' + req.method + ' ', req.url);
    req.bag = {}; 
    req.bag.session = req.session;
    next();
});

// router

// initialize solution
logger.info("Configuring Routes");
// routes and initializing request_handlder
for (let solutionName in defaultSolutionConfig["solutions"]) {
    logger.info("Setting Router and Request Handler for Solution: " + solutionName);
    let solutionConfig = defaultSolutionConfig["solutions"][solutionName];

    // request handler setup
    var req_handler_path = solutionConfig["request_handler"];
    var req_handler = require(req_handler_path);
    req_handler.setup(solutionConfig);
    logger.info("request hander for " + solutionName +" : " + req_handler_path);

    // route
    let rest_api_path = solutionConfig["rest_api_path"];
    let rest_api_routes = solutionConfig["rest_api_routes"];
    var restapi = require(rest_api_routes);
    app.use(rest_api_path, restapi);
    logger.info("route for "+solutionName+" service - " + rest_api_path + ": " + rest_api_routes);
}

// Add common service
const common_rest_api = require("common-utils/routes/common_rest_api");
app.use(common_rest_api.common_api_base, common_rest_api.router);

//Catch all to ensure React urls route correctly
app.get("*", function (req, res) {
    res.sendFile(path.resolve(__dirname + "/../build/index.html"));
});

//If the request is not process by this point, their are 2 possibilities:
//1. We don't have a route for handling the request
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});
//2. Something else went wrong
app.use(function(err, req, res, next) { // = development error handler, print
    // stack trace
    logger.error('Error Handler -', req.url);
    var errorCode = err.status || 500;
    res.status(errorCode);
    logger.error(err);
    var errorMsg = {
        msg : err.message,
        status : errorCode
    };

    if (req.path.startsWith("/api")) {
        logger.error(errorMsg);
        res.json(errorMsg);
        //res.send(errorMsg);
    }
    else {
        res.send(err);
        //res.render('index', {bag : {e:err}});
    }
});


//=====================================================================================================================
//                                                Launch Webserver
//=====================================================================================================================
// server.key and server.crt are required for HTTPS
// these certs can be created by the following steps with openssl:
//
//openssl genrsa -out key.pem
//openssl req -new -key key.pem -out csr.pem
//openssl x509 -req -days 9999 -in csr.pem -signkey key.pem -out cert.pem
//rm csr.pem

//openssl genrsa -des3 -out server.key 1024
//openssl req -new -key server.key -out server.csr
//cp server.key server.key.org
//openssl rsa -in server.key.org -out server.key
//openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
//rm -rf server.key.org
//rm -rf server.csr
/////////////////////////////////////////////////////////////////////////

var host = hfc.getConfigSetting('host');
var port = parseInt(hfc.getConfigSetting('port'));
var server = null;
//var server = http.createServer(app).listen(3000, function() { });

if (hfc.getConfigSetting('enable_https')) {
    let options = {
        key: fs.readFileSync('server.key'),
        cert: fs.readFileSync('server.crt')
    };
    logger.info("HTTPS enabled");
    logger.info('Staring https server on: ' + host + ':' + port);
    server = https.createServer(options, app).listen(port, function() {
        logger.info('------------------------------------------------');
        logger.info(' Server Up - ' + host + ':' + port );
        logger.info('------------------------------------------------');
    });

}
else {
    logger.info('Staring http server on: ' + host + ':' + port);
    server = http.createServer(app).listen(port, function() {
        logger.info('------------------------------------------------');
        logger.info(' Server Up - ' + host + ':' + port );
        logger.info('------------------------------------------------');
    });
}

// some setting needed for some node modeule
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
process.env.NODE_ENV = 'production';
server.timeout = 240000;

process.exitCode = 1;

var ws = require('ws');
var wss = {};

// =====================================================================================================================
//                                                     Blockchain Setup
// =====================================================================================================================
logger.info('configuring the chain object and its dependencies');
logger.info('------------------------------------------------');
logger.info(' Blockchain Setup' );
logger.info('------------------------------------------------');

// stup blockchian network and deploy chaincode
chain_helper.setupChain().then((done) => {	
    logger.info('------------------------------------------------');
    logger.info(' SERVER STARTED' );
    logger.info('------------------------------------------------');
	return solutionSetup()
}).then((done) => {
    logger.info('------------------------------------------------');
    logger.info(' SERVER READY' );
    logger.info('------------------------------------------------');
}).catch ((err) => {
    logger.error(err);
    logger.error('------------------------------------------------');
    logger.error(' SERVER FAILED TO START SUCCESSFULLY' );
    logger.error('------------------------------------------------');
    logger.error("exiting...");
    
    
    process.kill(process.pid, 'SIGTERM');
});


process.on('SIGTERM', () => {
    server.close(() => {
        logger.info('Server closed');
        process.exit(1);
    }); 
});


// =====================================================================================================================
//                                                     Solution Setup
// =====================================================================================================================
// implement solutin specific setup here
//
async function solutionSetup() {
    let waittime = parseInt(hfc.getConfigSetting('chaincode_upate_wait_time'));
    let solutionConfig = defaultSolutionConfig["solutions"]["claim"];

    // invoke setup()
    // get app admin config
    let adminConfig = defaultSolutionConfig["solutions"]["claim"]["app_admin"];
    let adminOrg = adminConfig["org"];
    let adminId = adminConfig["username"];
    let adminSecret = adminConfig["secret"];
    
    // get claim setup configs
    let user1Config = defaultSolutionConfig["solutions"]["claim"]["app_user1"];
    let user2Config = defaultSolutionConfig["solutions"]["claim"]["app_user2"];
    let user3Config = defaultSolutionConfig["solutions"]["claim"]["app_user3"];
    let userConfigs = [ user1Config, user2Config, user3Config ];

    let chaincodeConfig = defaultSolutionConfig["solutions"]["claim"]["chaincode"];
    let chaincodeName = chaincodeConfig["name"];
    let channelConfig = defaultSolutionConfig["solutions"]["claim"]["channels"];

    var phi_args = [];
    var args = [];
    // register users
    let userAttrs = [];
    for (let j = 0; j < userConfigs.length; j++) {
        let userConfig = userConfigs[j];
        let username = userConfig["username"];
        let secret = userConfig["secret"];
        let email = userConfig["email"];
        let orgName = userConfig["org"];
        var user = {};
        var enrollment = {};
        var attrList = {};
        try {
            [user, enrollment, attrList] = await user_manager.registerUser(username, secret, "user", orgName, email, null, null);
            logger.info("App user is registered successfully: " + username);
            
            let tmap = {};
            for (let i = 0; i < attrList.length; i++) {
                let attr = attrList[i];
                if (attr["name"] === "prvkey") {
                    tmap["prvkey"] = attr["value"];
                } else if (attr["name"] === "pubkey") {
                    tmap["pubkey"] = attr["value"];
                } else if (attr["name"] === "symkey") {
                    tmap["symkey"] = attr["value"];
                }
            }
        
            //user object
            let userObj = {
                id: username,
                name: username,
                role: "user",
                status: "active",
                secret: adminSecret,
                public_key: tmap["pubkey"],
                private_key: tmap["prvkey"],
                sym_key: tmap["symkey"],
                is_group: false,
                email: email,
                kms_public_key_id: "none",
                kms_private_key_id: "none",
                kms_sym_key_id: "none"
            };
            
            //add to phi args
            phi_args.push(JSON.stringify(userObj));
            
        } catch (err) {
            logger.error("Failed to register an app user ", err);
            throw new Error("Failed to register an app user: "+err)
        }
    }

    // add you instance of cloudant info to args
    // In this example we are using Cloudant-developer container instance
    // or you ca set environment variables 
    // CLOUDANT_USERNAME
    // CLOUDANT_PASSWORD
    // CLOUDANT_DATABASE
    // CLOUDANT_HOST
    let cloudant_username = process.env.CLOUDANT_USERNAME && process.env.CLOUDANT_USERNAME != 'undefined' ? process.env.CLOUDANT_USERNAME : "admin";
    let cloudant_password = process.env.CLOUDANT_PASSWORD && process.env.CLOUDANT_PASSWORD != 'undefined'? process.env.CLOUDANT_PASSWORD : "pass";
    let cloudant_host = process.env.CLOUDANT_HOST && process.env.CLOUDANT_HOST != 'undefined' ? process.env.CLOUDANT_HOST : "http://"+ ip.address()+":9080";
    let cloudant = {
        username: cloudant_username,
        password: cloudant_password,
        database: "claim2",
        host: cloudant_host
    };
    args.push(JSON.stringify(cloudant));
    
    // call setup function with AppAdmin
    let client = await chain_helper.getClientForOrg(adminOrg, adminId, adminSecret);
    let caClient = client.getCertificateAuthority();

    let fcn = "setup";

    for (let channelName in channelConfig) {
        logger.info("Invoke init for claim for channel "+channelName);
        let response = await chain_helper.invokePHI(adminId, adminSecret, channelName, chaincodeName, fcn, args, phi_args, null, adminOrg, client);
    }
    
    logger.info("Invoke setup for claim done successfully");
    return true
}

