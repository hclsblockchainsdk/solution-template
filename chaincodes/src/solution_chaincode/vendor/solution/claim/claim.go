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

package claim

import (
	"common/bchcls/asset_mgmt"
	"common/bchcls/asset_mgmt/asset_key_func"
	"common/bchcls/cached_stub"
	"common/bchcls/consent_mgmt"
	"common/bchcls/crypto"
	"common/bchcls/custom_errors"
	"common/bchcls/data_model"
	"common/bchcls/datastore"
	"common/bchcls/datastore/datastore_manager"
	"common/bchcls/datatype"
	"common/bchcls/index"
	"common/bchcls/key_mgmt"
	"common/bchcls/user_access_ctrl"
	"common/bchcls/user_mgmt"
	"common/bchcls/utils"

	"encoding/json"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/pkg/errors"
)

var logger = shim.NewLogger("Claim")

// ClaimAssetNamespace is the prefix of all claim asset IDs
const ClaimAssetNamespace string = "claim.Claim"

// IndexClaim is the name of the Claim index table
const IndexClaim = "Claim"

// Claim object
type Claim struct {
	ClaimID    string      `json:"claim_id"`
	Episode    string      `json:"episode"`
	Payer      string      `json:"payer"`
	Provider   string      `json:"provider"`
	UpdateDate int64       `json:"update_date"`
	Data       interface{} `json:"data"`
}

// claimPublicData contains the public data of a Claim object
// in our example, only the claim ID is public
type claimPublicData struct {
	ClaimID string `json:"claim_id"`
}

// claimPrivateData contains the private data of a Claim object
// in our example, all fields except claim ID are private
type claimPrivateData struct {
	Episode    string      `json:"episode"`
	Payer      string      `json:"payer"`
	Provider   string      `json:"provider"`
	UpdateDate int64       `json:"update_date"`
	Data       interface{} `json:"data"`
}

// SetupIndex creates indices for the Claim package
func SetupIndex(stub cached_stub.CachedStubInterface) error {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))

	// Encrypt index and store on off-chain store: optional paramters required [encryptedIndex, datastoreID]
	// If you want to store index on-chain unencrypted use the following line instead:
	// claimTable := index.GetTable(stub, IndexClaim, "claim_id", "false")
	claimTable := index.GetTable(stub, IndexClaim, "claim_id", false, true, datastore.DEFAULT_CLOUDANT_DATASTORE_ID)
	err := claimTable.AddIndex([]string{"episode", "payer", "provider", claimTable.GetPrimaryKeyId()}, false)
	if err != nil {
		err = errors.Wrap(err, "Failed to AddIndex 'episode', 'payer', 'provider' to IndexClaim")
		logger.Error(err)
		return err
	}
	err = claimTable.SaveToLedger()
	if err != nil {
		err = errors.Wrap(err, "Failed to SaveToLedger for IndexClaim")
		logger.Error(err)
		return err
	}
	return nil
}

// PutClaim adds or updates a claim on the ledger
func PutClaim(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))

	// Extract claim from args
	// Only argument we expect is the claim object itself
	if len(args) != 1 {
		err := &custom_errors.LengthCheckingError{Type: "PutClaim arguments length"}
		logger.Error(err)
		return nil, errors.WithStack(err)
	}

	claim := Claim{}
	err := json.Unmarshal([]byte(args[0]), &claim)
	if err != nil {
		err = errors.Wrap(err, "Failed to unmarshal claim")
		logger.Error(err)
		return nil, err
	}

	// Add datatype symkey for the "claim" datatype + caller, if the datatype sym key already exists, it will
	// simply return the existing key.
	// It's good practice to call AddDatatypeSymKey before adding a new asset to make sure that the datatype sym key exists.
	_, err = datatype.AddDatatypeSymKey(stub, caller, "claim", caller.ID)
	if err != nil {
		err = errors.Wrap(err, "Failed to add datatype key for claim datatype and caller")
		logger.Error(err)
		return nil, err
	}

	// Convert claim to asset
	asset := convertToAsset(claim)

	// Define user Bonnie for the examples below.
	// Again, in a real production system, you shouldn't hardcode userID.
	bonnieID := "Bonnie"

	// Save private data to a Cloudant DB.
	// In the following example, we will use myCloudantConnection for Bonnie and default cloudant datastore connection for all other users.
	// myCloudantConnection has been created during solution_template.AppSetup
	datastoreConnectionID := datastore.DEFAULT_CLOUDANT_DATASTORE_ID

	if caller.ID == bonnieID {
		// First check if "myCloudantConnection" has been defined before trying to use it.
		// this is a useful routine, so that the unit test of the claim chaincode does not have to worry about setting up the app.
		conn, err := datastore_manager.GetDatastoreConnection(stub, "myCloudantConnection")
		if err == nil && conn.ID == "myCloudantConnection" {
			datastoreConnectionID = "myCloudantConnection"
		}
	}
	asset.SetDatastoreConnectionID(datastoreConnectionID)

	// Get timestamp of transaction
	// The timestamp will be used to create an assetKey and for saving transaction log.
	// Note that the transaction timestamp value is same for all endorsing peers in a channel.
	timestamp, _ := stub.GetTxTimestamp()

	// Construct assetKey
	// Ususally, the asset key is passed in from from client in order to avoid non deterministic value.
	// In this example, the asset key is generated from the caller's sym key + transaction timestamp + assetID.
	// All these three values are same accross the peers within a channel.
	assetKeyBytes := append(caller.SymKey, asset.AssetId...)
	assetKeyBytes = append(assetKeyBytes, timestamp.String()...)

	assetKey := data_model.Key{}
	assetKey.ID = asset.AssetId + "Key"
	assetKey.KeyBytes = crypto.GetSymKeyFromHash(assetKeyBytes)
	assetKey.Type = key_mgmt.KEY_TYPE_SYM

	// Get an asset manager with the caller, and save the asset.
	// This will encrypt the private data of the asset w/ the asset key, and save the encrypted private data to the datastore specified above.
	// In this example, let's also set giveAccessToCaller to 'true' in order to give WRITE access to the caller (owner of the asset).
	// In most cases, giveAccessToCaller should be set to 'true' unless caller should not have access to asset for whatever reason.
	assetManager := asset_mgmt.GetAssetManager(stub, caller)
	err = assetManager.AddAsset(asset, assetKey, true)
	if err != nil {
		err = errors.Wrap(err, "Failed to register claim asset")
		logger.Error(err)
		return nil, err
	}

	// Give read access to Bonnie
	// The example below shows giving access another user.
	// Checking  caller.ID != bonnieID  ensures we are not adding access to caller again.
	if caller.ID != bonnieID {
		// Check if user Bonnie exists before adding access.
		// Since we are only interested in whether this user exists in our ledger, we pass in optional flags 'false' and
		// 'false' to GetUserData to indicate that we do not need to retrive Bonnie's private keys and private data.
		bonnie, err := user_mgmt.GetUserData(stub, caller, bonnieID, false, false)
		// In a production application, check if err != nil
		if err == nil && !utils.IsStringEmpty(bonnie.ID) {
			access := data_model.AccessControl{}
			access.Access = user_access_ctrl.ACCESS_READ
			access.UserId = bonnieID
			access.AssetId = asset.AssetId
			access.AssetKey = &assetKey

			// add access using AssetManager
			err = assetManager.AddAccessToAsset(access)
			// Alternative way to add access using user access manager
			//mgr := user_access_ctrl.GetUserAccessManager(stub, caller)
			//err = mgr.AddAccess(access)

			if err != nil {
				err = errors.Wrap(err, "Failed to add access")
				logger.Error(err)
				return nil, err
			}
		}
	}

	// save transaction log using history package
	err = PutClaimLog(stub, caller, claim)

	return nil, err
}

// GetClaim gets a claim by claimID
// Inputs:
//      args: [claimID]
// Return values:
//      byte slice: claimBytes.
//      error: any error that occurred
func GetClaim(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))
	// Parse the args
	if len(args) != 1 {
		logger.Error("Invalid args length")
		return nil, errors.New("Invalid args length")
	}

	claimID := string(args[0])
	assetID := asset_mgmt.GetAssetId(ClaimAssetNamespace, claimID)
	assetKeyID := assetID + "Key"

	am := asset_mgmt.GetAssetManager(stub, caller)
	assetKey, err := am.GetAssetKey(assetID, []string{caller.GetPubPrivKeyId(), assetKeyID})
	if err != nil {
		err = errors.Wrap(err, "Failed to get assetKey")
		logger.Error(err)
		return nil, err
	}
	asset, err := am.GetAsset(assetID, assetKey)
	if err != nil {
		err = errors.Wrap(err, "Failed to get asset")
		logger.Error(err)
		return nil, err
	}
	claim := convertFromAsset(asset)
	claimBytes, err := json.Marshal(&claim)
	if err != nil {
		err = errors.Wrap(err, "Failed to marshal claim")
		logger.Error(err)
		return nil, err
	}
	return claimBytes, nil
}

// GetClaimPage gets a collection of claims (that the caller has access to) from the ledger
// Inputs:
//      args: [limit, previousKey]
//      limit: the number of claims per collection
//      previousKey: the key returned by the previous call to GetClaimPage
// Return values:
//      byte slice: map{claimPage, previousKey}. Pass the previousKey to the call to start paging from the previous last key.
//      error: any error that occurred
func GetClaimPage(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))

	// Parse the args
	if len(args) != 2 {
		logger.Error("Invalid args length")
		return nil, errors.New("Invalid args length")
	}

	limit, err := strconv.Atoi(args[0])
	if err != nil {
		err = errors.Wrap(err, "Invalid limit")
		logger.Error(err)
		return nil, err
	}

	previousKey := args[1]

	// Get the claims collection
	claimPage, newPreviousKey, err := getClaimPageInternal(stub, caller, limit, previousKey)
	if err != nil {
		logger.Error(err)
		return nil, err
	}

	// Marshal claim page & previousKey into []byte
	retMap := map[string]interface{}{}
	retMap["claimPage"] = claimPage
	retMap["lastKey"] = newPreviousKey
	return json.Marshal(retMap)
}

// getClaimPageInternal gets a page of Claims (that the caller has access to) from the ledger
// Inputs:
//      limit: the number of claims per page
//      previousKey: the key returned by the previous call to GetClaimPage
// Return values:
//      Claim slice: page of claims
//      previousKey: pass this the next time you call this function
//      error: any error that occurred
func getClaimPageInternal(stub cached_stub.CachedStubInterface, caller data_model.User, limit int, previousKey string) ([]Claim, string, error) {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))
	// AssetKeyPathFunc to get a keyPath to get claim asset keys for each asset
	var assetKeyPathFunc asset_key_func.AssetKeyPathFunc = func(stub cached_stub.CachedStubInterface, caller data_model.User, asset data_model.Asset) ([]string, error) {

		// 1. user has direct read permission
		// assuming that caller is the owner of a claim
		// owner should have an access to claim asset symKey from caller's private key
		// since we specified "giveAccessToCaller" when claim asset is added
		assetKeyPath := []string{caller.GetPubPrivKeyId(), asset.AssetKeyId}
		logger.Debugf("callerID: %v, assetID: %v, assetKey: %v", caller.ID, asset.AssetId, assetKeyPath)
		ok, err := key_mgmt.VerifyAccessPath(stub, assetKeyPath)
		if ok && err == nil {
			return assetKeyPath, nil
		}

		// 2. user has been given read consent to asset
		consentID := consent_mgmt.GetConsentID(asset.AssetId, caller.ID, "")
		assetKeyPath = []string{caller.GetPubPrivKeyId(), consentID, asset.AssetKeyId}
		logger.Debugf("callerID: %v, assetID: %v, assetKey: %v", caller.ID, asset.AssetId, assetKeyPath)
		ok, err = key_mgmt.VerifyAccessPath(stub, assetKeyPath)
		if ok && err == nil {
			return assetKeyPath, nil
		}

		// 3. user has been given read consent to datatype
		if len(asset.OwnerIds) > 0 {
			consentID = consent_mgmt.GetConsentID("claim", caller.ID, asset.OwnerIds[0])
			datatypeKeyID := datatype.GetDatatypeKeyID("claim", asset.OwnerIds[0])
			assetKeyPath = []string{caller.GetPubPrivKeyId(), consentID, datatypeKeyID, asset.AssetKeyId}
			logger.Debugf("callerID: %v, assetID: %v, assetKey: %v", caller.ID, asset.AssetId, assetKeyPath)
			ok, err = key_mgmt.VerifyAccessPath(stub, assetKeyPath)
			if ok && err == nil {
				return assetKeyPath, nil
			}
		}

		logger.Debug("Failed to get keyPath")
		return nil, nil

	}

	// Get a assetIter of claim assets, by claim_id
	assetManager := asset_mgmt.GetAssetManager(stub, caller)
	assetIter, err := assetManager.GetAssetIter(
		ClaimAssetNamespace,
		IndexClaim,
		[]string{"claim_id"},
		[]string{},
		[]string{},
		true,
		false,
		assetKeyPathFunc,
		previousKey,
		limit,
		nil)
	if err != nil {
		logger.Errorf("Failed to get assetIter: %v", err)
		return []Claim{}, previousKey, errors.Wrap(err, "Failed to get assetIter")
	}

	// Iterate through assetIter, and get claim asset,
	// and then convert from asset to claim
	// append it to claimPage
	claimPage := []Claim{}
	defer assetIter.Close()
	for assetIter.HasNext() {
		asset, err := assetIter.Next()
		if err != nil {
			custom_err := &custom_errors.IterError{}
			logger.Errorf("%v: %v", custom_err, err)
			return claimPage, assetIter.GetPreviousLedgerKey(), errors.Wrap(err, custom_err.Error())
		}

		// Convert from asset to Claim, append it to the claimPage
		claimPage = append(claimPage, convertFromAsset(asset))
	}
	newPreviousKey := assetIter.GetPreviousLedgerKey()

	return claimPage, newPreviousKey, nil
}

// private function that converts claim to asset
func convertToAsset(claim Claim) data_model.Asset {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))

	asset := data_model.Asset{}
	asset.AssetId = asset_mgmt.GetAssetId(ClaimAssetNamespace, claim.ClaimID)
	asset.Datatypes = []string{"claim"}
	claimPublicData := claimPublicData{ClaimID: claim.ClaimID}
	claimPrivateData := claimPrivateData{Episode: claim.Episode, Payer: claim.Payer, Provider: claim.Provider, UpdateDate: claim.UpdateDate, Data: claim.Data}
	asset.PublicData, _ = json.Marshal(&claimPublicData)
	asset.PrivateData, _ = json.Marshal(&claimPrivateData)
	asset.IndexTableName = IndexClaim
	return asset
}

// private function that converts asset to claim
func convertFromAsset(asset *data_model.Asset) Claim {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))

	claim := Claim{}
	claimPrivate := claimPrivateData{}
	claimPublic := claimPublicData{}
	json.Unmarshal(asset.PrivateData, &claimPrivate)
	json.Unmarshal(asset.PublicData, &claimPublic)
	claim.ClaimID = claimPublic.ClaimID
	claim.Episode = claimPrivate.Episode
	claim.Payer = claimPrivate.Payer
	claim.Provider = claimPrivate.Provider
	claim.UpdateDate = claimPrivate.UpdateDate
	claim.Data = claimPrivate.Data
	return claim
}

// ============================================================================================================================
// SetLogLevel is called during instantiation step by Init() fuction
// if logLevel is passed as an instantiation paramenter
// ============================================================================================================================
func SetLogLevel(logLevel shim.LoggingLevel) {
	logger.SetLevel(logLevel)
	logger.Infof("Setting logging level to %v", logLevel)
}
