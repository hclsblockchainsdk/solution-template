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

// This file shows an example of package level unit test.
package claim

import (
	"common/bchcls/cached_stub"
	"common/bchcls/data_model"
	"common/bchcls/datatype"
	"common/bchcls/init_common"
	"common/bchcls/test_utils"
	"common/bchcls/user_mgmt"
	"common/bchcls/utils"

	"github.com/hyperledger/fabric/core/chaincode/shim"

	"encoding/json"
	"os"
	"strconv"
	"testing"
	"time"
)

// Sets up indices and registers caller
func setup(t *testing.T, dbname string) (*test_utils.NewMockStub, data_model.User) {
	logger.SetLevel(shim.LogDebug)
	// Setup indices
	mstub := test_utils.CreateNewMockStub(t)
	mstub.MockTransactionStart("init")
	stub := cached_stub.NewCachedStub(mstub)
	init_common.Init(stub, shim.LogDebug)

	// setup default cloudant datastore
	// change the following to your Cloudant instance if you want to connect to your own Cloudant
	// by setting environment variables
	// CLOUDANT_USERNAME
	// CLOUDANT_PASSWORD
	// CLOUDANT_DATABASE
	// CLOUDANT_HOST
	username := "admin"
	password := "pass"
	database := "solution-templae-test"
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

	database = database + "_" + dbname

	logger.Debugf("Cloudant: %v %v %v %v", username, password, database, host, "true")
	_, err := init_common.InitDatastore(stub, username, password, database, host)
	test_utils.AssertTrue(t, err == nil, "Expected init_common.InitDatastore to succeed")
	mstub.MockTransactionEnd("init")

	mstub.MockTransactionStart("t1")
	stub = cached_stub.NewCachedStub(mstub)
	SetupIndex(stub)
	mstub.MockTransactionEnd("t1")

	// Register claim datatype
	mstub.MockTransactionStart("t2")
	stub = cached_stub.NewCachedStub(mstub)
	dt, err := datatype.GetDatatypeWithParams(stub, "claim")
	if err != nil || dt.GetDatatypeID() != "claim" {
		_, err = datatype.RegisterDatatypeWithParams(stub, "claim", "claim data", true, "")
	}
	test_utils.AssertTrue(t, err == nil, "Expected no error returned")
	mstub.MockTransactionEnd("t2")

	// Register caller
	caller := test_utils.CreateTestUser("caller")
	mstub.MockTransactionStart("t3")
	stub = cached_stub.NewCachedStub(mstub)
	user_mgmt.RegisterUserWithParams(stub, caller, caller, false)
	mstub.MockTransactionEnd("t3")
	logger.SetLevel(shim.LogDebug)

	return mstub, caller
}

func TestPutClaim(t *testing.T) {
	// Setup indices & register caller
	mstub, caller := setup(t, "test1")

	// Create myClaim
	myClaim := Claim{ClaimID: "myClaim", Episode: "Physical", Payer: "InsuranceCo", Provider: "HospitalX", UpdateDate: time.Now().Unix()}
	myClaimBytes, _ := json.Marshal(myClaim)

	// add datatype symkey for the caller
	mstub.MockTransactionStart("t4")
	stub := cached_stub.NewCachedStub(mstub)
	_, err := datatype.AddDatatypeSymKey(stub, caller, "claim", caller.ID)
	test_utils.AssertTrue(t, err == nil, "Expected AddDatatypeSymKey to succeed")
	mstub.MockTransactionEnd("t4")

	// Save myClaim
	mstub.MockTransactionStart("t5")
	stub = cached_stub.NewCachedStub(mstub)
	retBytes, err := PutClaim(stub, caller, []string{string(myClaimBytes)})
	mstub.MockTransactionEnd("t5")
	test_utils.AssertTrue(t, len(retBytes) == 0, "Expected no bytes returned")
	test_utils.AssertTrue(t, err == nil, "Expected no error returned")
}

func TestGetClaimPage(t *testing.T) {
	// Setup indices & register caller
	mstub, caller := setup(t, "test2")

	// Create claims
	myClaim1 := Claim{ClaimID: "myClaim1", Episode: "Physical", Payer: "Bank1", Provider: "Hospital1", UpdateDate: time.Now().Unix()}
	myClaim2 := Claim{ClaimID: "myClaim2", Episode: "Surgery", Payer: "Bank2", Provider: "Hospital2", UpdateDate: time.Now().Unix()}
	myClaim3 := Claim{ClaimID: "myClaim3", Episode: "Lasik", Payer: "Bank3", Provider: "Hospital3", UpdateDate: time.Now().Unix()}
	myClaim1Bytes, _ := json.Marshal(myClaim1)
	myClaim2Bytes, _ := json.Marshal(myClaim2)
	myClaim3Bytes, _ := json.Marshal(myClaim3)

	// add datatype symkey for the caller
	mstub.MockTransactionStart("t9")
	stub := cached_stub.NewCachedStub(mstub)
	_, err := datatype.AddDatatypeSymKey(stub, caller, "claim", caller.ID)
	test_utils.AssertTrue(t, err == nil, "Expected AddDatatypeSymKey to succeed")
	mstub.MockTransactionEnd("t9")

	// Save claims
	mstub.MockTransactionStart("t10")
	stub = cached_stub.NewCachedStub(mstub)
	PutClaim(stub, caller, []string{string(myClaim1Bytes)})
	PutClaim(stub, caller, []string{string(myClaim2Bytes)})
	PutClaim(stub, caller, []string{string(myClaim3Bytes)})
	mstub.MockTransactionEnd("t10")

	mstub.MockTransactionStart("t11")
	stub = cached_stub.NewCachedStub(mstub)

	// Get claim page, limit = 10
	claimPageBytes, err := GetClaimPage(stub, caller, []string{"10", ""})
	test_utils.AssertTrue(t, err == nil, "Expected GetClaimPage to succeed")
	claimPage, _ := unmarshalClaimPage(claimPageBytes)
	test_utils.AssertTrue(t, len(claimPage) == 3, "Expected 3 claims in page: actual "+strconv.Itoa(len(claimPage)))
	test_utils.AssertTrue(t, claimPage[0].ClaimID == myClaim1.ClaimID, "Expected myClaim1")
	test_utils.AssertTrue(t, claimPage[1].ClaimID == myClaim2.ClaimID, "Expected myClaim2")
	test_utils.AssertTrue(t, claimPage[2].ClaimID == myClaim3.ClaimID, "Expected myClaim3")

	// Get claim page, limit = 2
	// Get first page
	claimPageBytes, err = GetClaimPage(stub, caller, []string{"2", ""})
	test_utils.AssertTrue(t, err == nil, "Expected GetClaimPage to succeed")
	claimPage, lastKey := unmarshalClaimPage(claimPageBytes)
	test_utils.AssertTrue(t, len(claimPage) == 2, "Expected 2 claims in page")
	test_utils.AssertTrue(t, claimPage[0].ClaimID == myClaim1.ClaimID, "Expected myClaim1")
	test_utils.AssertTrue(t, claimPage[1].ClaimID == myClaim2.ClaimID, "Expected myClaim2")

	// Get second page
	claimPageBytes, err = GetClaimPage(stub, caller, []string{"2", lastKey})
	test_utils.AssertTrue(t, err == nil, "Expected GetClaimPage to succeed")
	claimPage, _ = unmarshalClaimPage(claimPageBytes)
	test_utils.AssertTrue(t, len(claimPage) == 1, "Expected 1 claim in page")
	test_utils.AssertTrue(t, claimPage[0].ClaimID == myClaim3.ClaimID, "Expected myClaim3")

	mstub.MockTransactionEnd("t11")
}

func unmarshalClaimPage(claimPageBytes []byte) ([]Claim, string) {

	// Unmarshal to a map[string]interface
	var resultMap map[string]interface{}
	json.Unmarshal(claimPageBytes, &resultMap)

	// Get the lastKey
	lastKey, _ := resultMap["lastKey"].(string)

	// Get the claim page
	// We can't type cast directly to []Claim, so we have to jump through some hoops...
	claimBytes, _ := json.Marshal(resultMap["claimPage"])
	var claims []Claim
	json.Unmarshal(claimBytes, &claims)

	return claims, lastKey
}
