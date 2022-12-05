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

package main

import (
	"common/bchcls/cached_stub"
	"common/bchcls/init_common"
	"common/bchcls/sdk_life_cycle"
	"common/bchcls/user_mgmt"
	"solution/claim"

	"errors"
	"fmt"
	"runtime/debug"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	sc "github.com/hyperledger/fabric/protos/peer"
)

// Chaincode is a definition of the chaincode structure.
type Chaincode struct {
}

// ============================================================================================================================
// Init - Instantiates the chaincode
//        1. Run a very simple self test by writing to the ledger and printing out on any errors.
//        2. Initialize common packages by calling init_common.Init() with logLevel.
//        3. Initialize default datastore if the first args is "_cloudant".
//        4. Call solution specific Init function.
//
// optional args = ["_loglevel" loglevel, "_cloudant", username, password, database, host, (optioanl to drop db before initilizing) ]
//
// username, password, database, host will be set by the Network Oprator in production environment
// set username, password, database, hostvalues in solution.yaml for your local test
//
// loglevel = "DEBUG" | "INFO" | "NOTICE" | "WARNING" |"ERROR" | "CRITICAL"
// Refer to Shim's LoggingLevel for more information.
// ============================================================================================================================
func (t *Chaincode) Init(chaincodeStub shim.ChaincodeStubInterface) sc.Response {
	logger.Info("=====> Init")
	defer logger.Debug("<===== Init")

	stub := cached_stub.NewCachedStub(chaincodeStub, true, true)

	//////////////////////////////////////////////////////////////////////
	// DO NOT CHANGE THE CODE BETWEEN THESE LINES
	logLevel, err := init_common.InitSetup(stub)
	if err != nil {
		logger.Errorf("InitSetup failed: %v", err)
		return sdk_life_cycle.ErrorWrapper(stub, "InitSetup failed")
	}
	//
	// DO NOT CHANGE THE CODE BETWEEN THESE LINES
	//////////////////////////////////////////////////////////////////////

	// Call solution specific Init function
	err = InitApp(stub, logLevel)
	if err != nil {
		logger.Errorf("Failed to run solution_template Init: %v", err)
		return sdk_life_cycle.ErrorWrapper(stub, "Failed to run solution_template Init")
	}

	logger.Info("Initialization complete") //self-test pass

	return sdk_life_cycle.SuccessWrapper(stub, nil)
}

// ============================================================================================================================
// Invoke - Our entry point for Invokes
// ============================================================================================================================
func (t *Chaincode) Invoke(chaincodeStub shim.ChaincodeStubInterface) (result sc.Response) {
	// get cached stub from chaincode stub
	stub := cached_stub.NewCachedStub(chaincodeStub)
	functionName, _ := stub.GetFunctionAndParameters()

	logger.Infof("=====> Invoke %v", functionName)
	defer logger.Debugf("<===== Invoke %v", functionName)

	//////////////////////////////////////////////////////////////////////
	// DO NOT CHANGE THE CODE BETWEEN THESE LINES
	//
	// InvokeSetup performs following:
	// - Checks caller's identity and caller's keys are retrieved properly.
	// - Performs chaincode login.
	// - Decrypts args if encrypted.
	// - Gets and parses phi_args.
	// - Runs InitByInvoke if "Init" function is called.
	caller, function, args, toReturn, err := init_common.InvokeSetup(stub)
	if err != nil {
		logger.Errorf("InvokeSetup failed: %v", err)
		return sdk_life_cycle.ErrorWrapper(stub, "InvokeSetup failed")
	}
	if toReturn {
		return sdk_life_cycle.SuccessWrapper(stub, nil)
	}
	//
	// DO NOT CHANGE THE CODE BETWEEN THESE LINES
	//////////////////////////////////////////////////////////////////////

	// error handling
	defer func() {
		if r := recover(); r != nil {
			var ok bool
			result, ok = r.(sc.Response)
			if !ok {
				message := fmt.Sprintf("pkg %v", r)
				logger.Error(message)
				logger.Error("stacktrace from panic: \n" + string(debug.Stack()))
				result = sdk_life_cycle.ErrorWrapper(stub, message)
			}
		}
	}()

	logger.Debug("starting invoke, for - " + function)

	var returnBytes []byte
	var returnError error = errors.New("Unknown function: " + function)

	// Handle different functions
	if function == "setup" {
		// get cached stub from chaincode stub, enabling putCache
		// because consent and datatype sym key will be created in the same transaction
		stub2 := cached_stub.NewCachedStub(chaincodeStub, true, true)
		returnBytes, returnError = SetupApp(stub2, caller, args)
		result = sdk_life_cycle.GetResult(stub2, function, returnBytes, returnError)

	} else if function == "registerSolutionUser" {
		// get cached stub from chaincode stub, enabling putCache
		// because user and datatype sym key will be created in the same transaction
		stub2 := cached_stub.NewCachedStub(chaincodeStub, true, true)
		returnBytes, returnError = RegisterUser(stub2, caller, args)
		result = sdk_life_cycle.GetResult(stub2, function, returnBytes, returnError)
	} else if function == "registerUser" {
		returnBytes, returnError = user_mgmt.RegisterUser(stub, caller, args)
	} else if function == "registerSystemAdmin" {
		returnBytes, returnError = user_mgmt.RegisterSystemAdmin(stub, caller, args)
	} else if function == "registerAuditor" {
		returnBytes, returnError = user_mgmt.RegisterAuditor(stub, caller, args)
	} else if function == "registerOrg" {
		returnBytes, returnError = user_mgmt.RegisterOrg(stub, caller, args)
	} else if function == "updateOrg" {
		returnBytes, returnError = user_mgmt.UpdateOrg(stub, caller, args)
	} else if function == "putUserInOrg" {
		returnBytes, returnError = user_mgmt.PutUserInOrg(stub, caller, args)
	} else if function == "addClaim" {
		// get cached stub from chaincode stub, enabling putCache
		// because adding datatype key and put asset will be in the same transaction
		stub2 := cached_stub.NewCachedStub(chaincodeStub, true, true)
		returnBytes, returnError = claim.PutClaim(stub2, caller, args)
		result = sdk_life_cycle.GetResult(stub2, function, returnBytes, returnError)
	} else if function == "getOrg" {
		returnBytes, returnError = user_mgmt.GetOrg(stub, caller, args)
	} else if function == "getOrgs" {
		returnBytes, returnError = user_mgmt.GetOrgs(stub, caller, args)
	} else if function == "getUser" {
		returnBytes, returnError = user_mgmt.GetUser(stub, caller, args)
	} else if function == "getUsers" {
		returnBytes, returnError = user_mgmt.GetUsers(stub, caller, args)
	} else if function == "getClaim" {
		returnBytes, returnError = claim.GetClaim(stub, caller, args)
	} else if function == "getClaims" {
		returnBytes, returnError = claim.GetClaimPage(stub, caller, args)
	} else if function == "getLogs" {
		returnBytes, returnError = claim.GetClaimLogs(stub, caller, args)
	}

	//////////////////////////////////////////////////////////////////////
	// DO NOT CHANGE THE CODE BETWEEN THESE LINES
	return sdk_life_cycle.GetResult(stub, function, returnBytes, returnError)
	// DO NOT CHANGE THE CODE BETWEEN THESE LINES
	//////////////////////////////////////////////////////////////////////
}
