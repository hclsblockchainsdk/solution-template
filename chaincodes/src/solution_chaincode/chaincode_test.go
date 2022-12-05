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
	"solution/claim"

	"common/bchcls/data_model"
	"common/bchcls/test_utils"
	"common/bchcls/utils"

	"encoding/json"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/hyperledger/fabric/core/chaincode/shim"
)

func TestInit(t *testing.T) {
	logger.Debug("\n\n===========================================================================\n\n")
	//set loging level to DEBUG
	logger.SetLevel(shim.LogDebug)

	cc := new(Chaincode)
	stub := test_utils.CreateNewMockStub(t, "chaincode", cc)

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST Init
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	//instantiate chaincode by calling Init
	//args = ["_loglevel" loglevel, "_cloudant", username, password, database, host ]
	args := [][]byte{}
	args = append(args, []byte("init"))
	args = append(args, []byte("_loglevel"))
	args = append(args, []byte("DEBUG"))
	args = append(args, []byte("_cloudant"))

	username := "admin"
	password := "pass"
	database := "solution-template"
	host := "http://127.0.0.1:9080"

	// Get values from environment variables
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_USERNAME")) {
		username = os.Getenv("CLOUDANT_USERNAME")
	}
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_PASSWORD")) {
		password = os.Getenv("CLOUDANT_PASSWORD")
	}
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_DATABASE")) {
		database = os.Getenv("CLOUDANT_DATABASE")
	}
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_HOST")) {
		host = os.Getenv("CLOUDANT_HOST")
	}

	args = append(args, []byte(username))
	args = append(args, []byte(password))
	args = append(args, []byte(database))
	args = append(args, []byte(host))
	//args = append(args, []byte("true"))

	res := stub.MockInit("1", args)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Init failed: "+res.Message)

	logger.Info("Instantiating chaincode done sucessfully")
}

// setup runs init, initByInvoke, and setup.
// returns stub, cc, appAdmijn, user1, user2, user3
func runTestInit(t *testing.T) (stub *test_utils.NewMockStub, appAdmin data_model.User, user1 data_model.User, user2 data_model.User, user3 data_model.User) {
	//set loging level to DEBUG
	logger.SetLevel(shim.LogDebug)

	cc := new(Chaincode)
	stub = test_utils.CreateNewMockStub(t, "chaincode", cc)

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST Init
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	//instantiate chaincode by calling Init
	//args = ["_loglevel" loglevel, "_cloudant", username, password, database, host ]
	args := [][]byte{}
	args = append(args, []byte("init"))
	args = append(args, []byte("_loglevel"))
	args = append(args, []byte("DEBUG"))
	args = append(args, []byte("_cloudant"))

	username := "admin"
	password := "pass"
	database := "solution-template"
	host := "http://127.0.0.1:9080"

	// Get values from environment variables
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_USERNAME")) {
		username = os.Getenv("CLOUDANT_USERNAME")
	}
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_PASSWORD")) {
		password = os.Getenv("CLOUDANT_PASSWORD")
	}
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_DATABASE")) {
		database = os.Getenv("CLOUDANT_DATABASE")
	}
	if !utils.IsStringEmpty(os.Getenv("CLOUDANT_HOST")) {
		host = os.Getenv("CLOUDANT_HOST")
	}

	args = append(args, []byte(username))
	args = append(args, []byte(password))
	args = append(args, []byte(database))
	args = append(args, []byte(host))
	args = append(args, []byte("true"))

	res := stub.MockInit("1", args)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Init failed: "+res.Message)

	logger.Info("Instantiating chaincode done sucessfully")

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST invoke init
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	//send init invoke to register AppAdmin user
	appAdmin = test_utils.CreateTestUser("AppAdmin")
	appAdmin.Role = "system"
	arg, err := json.Marshal(&appAdmin)
	test_utils.AssertTrue(t, err == nil, "Failed to get appAdmin user data")

	args = [][]byte{}
	args = append(args, []byte("init"))
	//args = append(args, arg)
	tmap := test_utils.GetTransientMapFromUser(appAdmin)
	tmap, args = test_utils.AddPHIArgsToTransientMap(tmap, args, arg)
	res = stub.MockInvoke("2", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke init failed: "+res.Message)

	logger.Info("Invoke init done sucessfully")
	time.Sleep(500 * time.Microsecond)

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST invoke setup
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	//create three users
	user1 = test_utils.CreateTestUser("Hao")
	arg1, err := json.Marshal(&user1)
	test_utils.AssertTrue(t, err == nil, "Failed to get user1 data")

	user2 = test_utils.CreateTestUser("Alex")
	arg2, err := json.Marshal(&user2)
	test_utils.AssertTrue(t, err == nil, "Failed to get user2 data")

	user3 = test_utils.CreateTestUser("Bonnie")
	arg3, err := json.Marshal(&user3)
	test_utils.AssertTrue(t, err == nil, "Failed to get user3 data")

	//second off-chain store
	var conn map[string]string = make(map[string]string)
	conn["username"] = username
	conn["password"] = password
	conn["database"] = database
	conn["host"] = host
	arg4, err := json.Marshal(&conn)
	test_utils.AssertTrue(t, err == nil, "Failed to marshal connection data")

	//send setup invoke
	args = [][]byte{}
	args = append(args, []byte("setup"))
	args = append(args, arg4)
	tmap = test_utils.GetTransientMapFromUser(appAdmin)
	tmap, args = test_utils.AddPHIArgsToTransientMap(tmap, args, arg1, arg2, arg3)
	res = stub.MockInvoke("3", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke setup failed: "+res.Message)

	logger.Info("Invoke setup done sucessfully")

	return
}

func TestInvoke(t *testing.T) {
	// appAdmin is an auditor
	stub, auditor, hao, alex, bonnie := runTestInit(t)

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST invoke addClaim
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	// Create claims for hao
	myClaim1 := claim.Claim{ClaimID: "myClaim1", Episode: "Physical", Payer: "Bank1", Provider: "Hospital1", UpdateDate: time.Now().Unix()}
	myClaim2 := claim.Claim{ClaimID: "myClaim2", Episode: "Surgery", Payer: "Bank2", Provider: "Hospital2", UpdateDate: time.Now().Unix()}
	myClaim3 := claim.Claim{ClaimID: "myClaim3", Episode: "Lasik", Payer: "Bank3", Provider: "Hospital3", UpdateDate: time.Now().Unix()}
	myClaim1Bytes, _ := json.Marshal(myClaim1)
	myClaim2Bytes, _ := json.Marshal(myClaim2)
	myClaim3Bytes, _ := json.Marshal(myClaim3)

	// hao addes a claim
	args := [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim1Bytes)
	tmap := test_utils.GetTransientMapFromUser(hao)
	res := stub.MockInvoke("4", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed :"+res.Message)
	time.Sleep(500 * time.Microsecond)

	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim2Bytes)
	tmap = test_utils.GetTransientMapFromUser(hao)
	res = stub.MockInvoke("5", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim3Bytes)
	tmap = test_utils.GetTransientMapFromUser(hao)
	res = stub.MockInvoke("6", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	// Create claims for alex
	myClaim1 = claim.Claim{ClaimID: "myClaim11", Episode: "Physical", Payer: "Bank1", Provider: "Hospital1", UpdateDate: time.Now().Unix()}
	myClaim2 = claim.Claim{ClaimID: "myClaim12", Episode: "Surgery", Payer: "Bank2", Provider: "Hospital2", UpdateDate: time.Now().Unix()}
	myClaim3 = claim.Claim{ClaimID: "myClaim13", Episode: "Lasik", Payer: "Bank3", Provider: "Hospital3", UpdateDate: time.Now().Unix()}
	myClaim1Bytes, _ = json.Marshal(myClaim1)
	myClaim2Bytes, _ = json.Marshal(myClaim2)
	myClaim3Bytes, _ = json.Marshal(myClaim3)

	// alex addes a claim
	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim1Bytes)
	tmap = test_utils.GetTransientMapFromUser(alex)
	res = stub.MockInvoke("7", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim2Bytes)
	tmap = test_utils.GetTransientMapFromUser(alex)
	res = stub.MockInvoke("8", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim3Bytes)
	tmap = test_utils.GetTransientMapFromUser(alex)
	res = stub.MockInvoke("9", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	// Create claims for bonnie
	myClaim1 = claim.Claim{ClaimID: "myClaim21", Episode: "Physical", Payer: "Bank1", Provider: "Hospital1", UpdateDate: time.Now().Unix()}
	myClaim2 = claim.Claim{ClaimID: "myClaim22", Episode: "Surgery", Payer: "Bank2", Provider: "Hospital2", UpdateDate: time.Now().Unix()}
	myClaim3 = claim.Claim{ClaimID: "myClaim23", Episode: "Lasik", Payer: "Bank3", Provider: "Hospital3", UpdateDate: time.Now().Unix()}
	myClaim1Bytes, _ = json.Marshal(myClaim1)
	myClaim2Bytes, _ = json.Marshal(myClaim2)
	myClaim3Bytes, _ = json.Marshal(myClaim3)

	// alex addes a claim
	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim1Bytes)
	tmap = test_utils.GetTransientMapFromUser(bonnie)
	res = stub.MockInvoke("10", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim2Bytes)
	tmap = test_utils.GetTransientMapFromUser(bonnie)
	res = stub.MockInvoke("11", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	args = [][]byte{}
	args = append(args, []byte("addClaim"))
	args = append(args, myClaim3Bytes)
	tmap = test_utils.GetTransientMapFromUser(bonnie)
	res = stub.MockInvoke("12", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke addClaim failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	logger.Info("Invoke addVehicl done sucessfully")

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST invoke getClaims
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	// Get claim page, limit = 10
	args = [][]byte{}
	args = append(args, []byte("getClaims"))
	args = append(args, []byte("10"))
	args = append(args, []byte(""))
	tmap = test_utils.GetTransientMapFromUser(hao)
	res = stub.MockInvoke("13", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke getClaims failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	claimPageBytes := res.GetPayload()
	claimPage, _ := unmarshalClaimPage(claimPageBytes)
	test_utils.AssertTrue(t, len(claimPage) == 9, "Expected 9 claims in page; Got "+strconv.Itoa(len(claimPage)))

	// Get claim page, limit = 5
	// Get first page
	args = [][]byte{}
	args = append(args, []byte("getClaims"))
	args = append(args, []byte("5"))
	args = append(args, []byte(""))
	tmap = test_utils.GetTransientMapFromUser(hao)
	res = stub.MockInvoke("14", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke getClaims failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	claimPageBytes = res.GetPayload()
	claimPage, lastKey := unmarshalClaimPage(claimPageBytes)
	test_utils.AssertTrue(t, len(claimPage) == 5, "Expected 5 claims in page; Got "+strconv.Itoa(len(claimPage)))

	// Get second page
	args = [][]byte{}
	args = append(args, []byte("getClaims"))
	args = append(args, []byte("5"))
	args = append(args, []byte(lastKey))
	tmap = test_utils.GetTransientMapFromUser(hao)
	res = stub.MockInvoke("15", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke getClaims failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	claimPageBytes = res.GetPayload()
	claimPage, _ = unmarshalClaimPage(claimPageBytes)
	test_utils.AssertTrue(t, len(claimPage) == 4, "Expected 4 claim in page; Got "+strconv.Itoa(len(claimPage)))

	logger.Info("Invoke getClaim done sucessfully")

	//////////////////////////////////////////////////////////////////////////////////////////////////////
	//  TEST invoke getLogs
	//////////////////////////////////////////////////////////////////////////////////////////////////////

	var logs []data_model.TransactionLog

	// get history by Episode
	args = [][]byte{}
	args = append(args, []byte("getLogs"))
	args = append(args, []byte(""))
	args = append(args, []byte("Surgery"))
	args = append(args, []byte("0"))
	args = append(args, []byte("0"))
	args = append(args, []byte(""))
	args = append(args, []byte("false"))
	args = append(args, []byte("20"))
	tmap = test_utils.GetTransientMapFromUser(auditor)
	res = stub.MockInvoke("16", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke getLogs failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	resultBytes := res.GetPayload()
	err := json.Unmarshal(resultBytes, &logs)
	test_utils.AssertTrue(t, err == nil, "Expected unmarshal to succeed")
	test_utils.AssertTrue(t, len(logs) == 3, "Expected length of log is 3")

	// get history by User
	args = [][]byte{}
	args = append(args, []byte("getLogs"))
	args = append(args, []byte("Bonnie"))
	args = append(args, []byte(""))
	args = append(args, []byte("0"))
	args = append(args, []byte("0"))
	args = append(args, []byte(""))
	args = append(args, []byte("false"))
	args = append(args, []byte("20"))
	tmap = test_utils.GetTransientMapFromUser(auditor)
	res = stub.MockInvoke("17", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke getLogs failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	resultBytes = res.GetPayload()
	err = json.Unmarshal(resultBytes, &logs)
	test_utils.AssertTrue(t, err == nil, "Expected unmarshal to succeed")
	test_utils.AssertTrue(t, len(logs) == 3, "Expected length of log is 3")

	// get history by User and Episode
	args = [][]byte{}
	args = append(args, []byte("getLogs"))
	args = append(args, []byte("Bonnie"))
	args = append(args, []byte("Surgery"))
	args = append(args, []byte("0"))
	args = append(args, []byte("0"))
	args = append(args, []byte(""))
	args = append(args, []byte("false"))
	args = append(args, []byte("20"))
	tmap = test_utils.GetTransientMapFromUser(auditor)
	res = stub.MockInvoke("18", args, tmap)
	test_utils.AssertTrue(t, res.Status == shim.OK, "Invoke getLogs failed: "+res.Message)
	time.Sleep(500 * time.Microsecond)

	resultBytes = res.GetPayload()
	err = json.Unmarshal(resultBytes, &logs)
	test_utils.AssertTrue(t, err == nil, "Expected unmarshal to succeed")
	test_utils.AssertTrue(t, len(logs) == 1, "Expected length of log is 1")

	logger.Info("Invoke getLogs done sucessfully")
}

// unmarshal claim pages returned by GetClaimPage
func unmarshalClaimPage(claimPageBytes []byte) ([]claim.Claim, string) {
	// Unmarshal to a map[string]interface
	var resultMap map[string]interface{}
	json.Unmarshal(claimPageBytes, &resultMap)

	// Get the lastKey
	lastKey, _ := resultMap["lastKey"].(string)

	// Get the claim page
	claimBytes, _ := json.Marshal(resultMap["claimPage"])
	var claims []claim.Claim
	json.Unmarshal(claimBytes, &claims)

	return claims, lastKey
}
