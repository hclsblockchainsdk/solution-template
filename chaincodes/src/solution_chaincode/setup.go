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
	"common/bchcls/consent_mgmt"
	"common/bchcls/data_model"
	"common/bchcls/datastore"
	"common/bchcls/datastore/datastore_manager"
	"common/bchcls/datatype"
	"common/bchcls/user_access_ctrl"
	"common/bchcls/user_mgmt"
	"common/bchcls/user_mgmt/user_keys"
	"common/bchcls/utils"
	"solution/claim"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/pkg/errors"

	"encoding/json"
	"net/url"
)

// ============================================================================================================================
// Init Application
// ============================================================================================================================
// Init is called by main.Init() fuction, which is called during chaincode Instantiation.
// When this fuction is called, no user has been registered yet.
// So, only context free setup such as initializing indices for the solution should be put in this function.
func InitApp(stub cached_stub.CachedStubInterface, logLevel shim.LoggingLevel) error {
	//set log level
	SetLogLevel(logLevel)

	//add indices to be used in this solution
	err := claim.SetupIndex(stub)
	if err != nil {
		err = errors.Wrap(err, "Failed to create claim package indices")
		logger.Error(err)
		return err
	}
	logger.Info("claim package indices created successfully")

	// Register claim datatype
	dt, err := datatype.GetDatatypeWithParams(stub, "claim")
	if err != nil || dt.GetDatatypeID() != "claim" {
		_, err := datatype.RegisterDatatypeWithParams(stub, "claim", "claim data", true, "")
		if err != nil {
			logger.Errorf("Failed to run regiser datatype: %v", err)
			return errors.New("Failed to run register datatype")
		}
	}
	logger.Info("claim datatype registered successfully")

	return nil
}

// ============================================================================================================================
// Setup Application
// ============================================================================================================================
// SetupApp function is called by the client app after chaincode is instantiated and after theInitByInvoke function has been executed successfully.
// You may add additional app specific settings here.
// Args to be passed to this function should be designed by the solution developer.
//
// In this example, three user objects are passed as args from the client App.
// 1. Register three users: Hao, Alex, and Bonnie
// 2. Datatype symkey of claim dataype is created for Hao. Note that claim datatype has been already created during Init().
// 3. Hao (user1) gives a read consent to Alex (user2) for the datatype "claim", so that Alex can also view all claims registered by Hao.
// 4. Finally, myCloudantConnection is registered for use by the solution.
//    Note that this is a custom connection in addition to the default connection created in Init().
//
// In this claim example:
// - Claims registered by Hao, can also be viewed by Alex since Hao gave read consent to Alex.
// - Bonnie can view claims registered by any user since read access is given in claim.PutClaim function.
// - AppAdmin functions as an auditor user since all users registered by solution_template.RegisterUser() gives aditor permission to AppAdmin User -- See RegisterUser() fuction below.
// - Private data of claims registered by Bonnie is encrypted and saved through myCloudantConnection.
// - Private data of claims registered by all other users are encrypted and saved to the default Cloudant datastore.
//
// NOTE: In the following example, we are logging all arg values passed in: user objects and connection object.
//       In a real production system, you should not put PHIs in a log. This is just an example.
func SetupApp(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) {
	defer utils.ExitFnLog(utils.EnterFnLog())

	// parse args
	if len(args) != 4 {
		err := errors.New("Number of args should be 4")
		logger.Error(err)
		return nil, err
	}

	var user1 = data_model.User{}
	var user1Bytes = []byte(args[1])
	json.Unmarshal(user1Bytes, &user1)
	logger.Debugf("user 1: %v", user1.ID)
	_, err := RegisterUser(stub, caller, []string{args[1], "true"})
	if err != nil {
		logger.Errorf("Unable to register app user1: %v", err)
		return nil, errors.New("Unable to register app user1")
	}

	var user2 = data_model.User{}
	var user2Bytes = []byte(args[2])
	json.Unmarshal(user2Bytes, &user2)
	logger.Debugf("user 2: %v", user2.ID)
	_, err = RegisterUser(stub, caller, []string{args[2], "true"})
	if err != nil {
		logger.Errorf("Unable to register app user2: %v", err)
		return nil, errors.New("Unable to register app user2")
	}

	var user3 = data_model.User{}
	var user3Bytes = []byte(args[3])
	json.Unmarshal(user3Bytes, &user3)
	logger.Debugf("user 3: %v", user3.ID)
	_, err = RegisterUser(stub, caller, []string{args[3], "true"})
	if err != nil {
		logger.Errorf("Unable to register app user3: %v", err)
		return nil, errors.New("Unable to register app user3")
	}

	// read user1
	// this can be done, since PutCache has been enabled
	user1, err = user_mgmt.GetUserData(stub, caller, user1.ID, true)
	if err != nil {
		logger.Errorf("Unable to get app user1: %v", err)
		return nil, errors.New("Unable to get app user1")
	}

	// add datatype symkey for user1
	_, err = datatype.AddDatatypeSymKey(stub, user1, "claim", user1.ID)
	if err != nil {
		logger.Errorf("Unable to add datatype key for user1: %v", err)
		return nil, errors.New("Unable to add datatype key for user1")
	}

	// add consent
	timestamp, _ := stub.GetTxTimestamp()
	// user1 gives consent to user2 to read user1's claim data
	consent := data_model.Consent{
		CreatorID:   user1.ID,
		OwnerID:     user1.ID,
		TargetID:    user2.ID,
		DatatypeID:  "claim",
		Access:      consent_mgmt.ACCESS_READ,
		ConsentDate: timestamp.GetSeconds(),
	}

	consentKey := user1.SymKey
	err = consent_mgmt.PutConsentWithParams(stub, caller, consent, consentKey)
	if err != nil {
		err = errors.Wrap(err, "Failed to put consent")
		logger.Error(err)
		return nil, err
	}

	// Create a custom connection
	// Specify values for your own instance of Cloudant
	// In this example we passed in connection information as an input arg

	// example to set connectString values directly
	/*
		params := url.Values{}
		params.Add("username", "admin")
		params.Add("password", "pass")
		params.Add("database", "mydatabase")
		params.Add("host", "http://cloudant.example.com:9080")
		params.Add("create_database", "true")
	*/

	var connStr map[string]string
	var connBytes = []byte(args[0])
	json.Unmarshal(connBytes, &connStr)
	logger.Debugf("connection: %v", connStr)

	params := url.Values{}
	for k, v := range connStr {
		params.Add(k, v)
	}
	if _, ok := params["create_database"]; !ok {
		params.Add("create_database", "true")
	}

	connection := datastore.DatastoreConnection{
		ID:         "myCloudantConnection",
		Type:       datastore.DATASTORE_TYPE_DEFAULT_CLOUDANT,
		ConnectStr: params.Encode(),
	}
	err = datastore_manager.PutDatastoreConnection(stub, caller, connection)
	if err != nil {
		logger.Errorf("Failed to register connection: %v", err)
		return nil, errors.New("Failed to register connection")
	}
	// verify that values by trying to instantiate the datastore
	_, err = datastore_manager.GetDatastoreImpl(stub, "myCloudantConnection")
	if err != nil {
		logger.Errorf("Failed to instantiate myCloudantConnection: %v", err)
		return nil, errors.New("Failed to instantiate myCloudantConnection")
	}

	return nil, nil
}

// ============================================================================================================================
// Register User
// ============================================================================================================================
// In this example, all users will give AppAdmin "auditor" permission during user registration.
// so that AppAdmin can audit the transactions that register claims.
func RegisterUser(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))
	logger.Debugf("RegisterUser args: %v", args)

	// register user by calling user management package
	_, err := user_mgmt.RegisterUser(stub, caller, args)
	if err != nil {
		err = errors.Wrap(err, "Failed to register user")
		logger.Error(err)
		return nil, err
	}

	// Do extra solution specic tasks here
	//

	// Get user
	userArg := data_model.User{}
	userBytes := []byte(args[0])
	json.Unmarshal(userBytes, &userArg)
	userID := userArg.ID
	//get user data with option to get private and sym key of the user
	user, err := user_mgmt.GetUserData(stub, caller, userID, true)

	//create datatype sym key for the user
	_, err = datatype.AddDatatypeSymKey(stub, user, "claim", userID)
	if err != nil {
		err = errors.Wrap(err, "Failed to add datatype key for Claim")
		logger.Error(err)
		return nil, err
	}

	// Purpose of this section is to show an example of how to use user_access_ctrl package to grant auditor permission.
	// Note that in a real production system, you shouldn't hard coded auditor ID like bellow.
	auditorID := "AppAdmin"
	// Check if auditor exists before granting access to the log
	auditor, err := user_mgmt.GetUserData(stub, caller, auditorID)
	if err == nil && auditor.ID == auditorID {
		//give the auditor permission by adding access to user log sym key
		if !utils.IsStringEmpty(auditorID) && auditorID != userID {
			auditorPubkey, err := user_keys.GetUserPublicKey(stub, user, auditorID)
			if err != nil {
				err = errors.Wrap(err, "Failed to get publickey of app admin user")
				logger.Error(err)
				return nil, err
			}

			mgr := user_access_ctrl.GetUserAccessManager(stub, user)
			err = mgr.AddAccessByKey(auditorPubkey, user.GetLogSymKey())
			if err != nil {
				err = errors.Wrap(err, "Failed to add access")
				logger.Error(err)
				return nil, err
			}
			logger.Infof("Giving the app admin user to access transaction log of the user %v", caller.ID)
		}
	}

	return nil, nil
}

// ============================================================================================================================
// SetLogLevel is called during instantiation step by InitApp() fuction
// ============================================================================================================================
func SetLogLevel(logLevel shim.LoggingLevel) {
	logger.SetLevel(logLevel)
	shim.SetLoggingLevel(logLevel)
	claim.SetLogLevel(logLevel)

	logger.Infof("Setting logging level to %v", logLevel)
}
