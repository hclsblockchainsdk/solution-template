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
	"common/bchcls/custom_errors"
	"common/bchcls/data_model"
	"common/bchcls/history"
	"common/bchcls/key_mgmt"
	"common/bchcls/simple_rule"
	"common/bchcls/utils"
	"encoding/json"
	"strconv"

	"github.com/pkg/errors"
)

// LogData is the data exposed to the auditor
type LogData struct {
	ClaimID string `json:"claim_id"`
	Episode string `json:"episode"`
	Payer   string `json:"model"`
}

// PutClaimLog adds or update logs using the history package
// In this example, we only log claim registration.
// Queries are not logged.
func PutClaimLog(stub cached_stub.CachedStubInterface, caller data_model.User, claim Claim) error {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))

	data := LogData{}
	data.ClaimID = claim.ClaimID
	data.Episode = claim.Episode
	data.Payer = claim.Payer

	// Get timestamp of transaction
	timestamp, _ := stub.GetTxTimestamp()

	// save transaction log using history package
	// Field1, Field2, etc. are indexing fields
	transactionLog := data_model.TransactionLog{}
	transactionLog.TransactionID = stub.GetTxID()
	transactionLog.Namespace = "claim"
	transactionLog.FunctionName = "PutClaim"
	transactionLog.CallerID = caller.ID
	transactionLog.Timestamp = timestamp.GetSeconds()
	transactionLog.Data = data
	transactionLog.Field1 = caller.ID
	transactionLog.Field2 = claim.Episode

	logSymKey := caller.GetLogSymKey()
	assetManager := asset_mgmt.GetAssetManager(stub, caller)
	historyManager := history.GetHistoryManager(assetManager)
	err := historyManager.PutInvokeTransactionLog(transactionLog, logSymKey)
	if err != nil {
		err = errors.Wrap(err, "Failed to log claim transaction")
		logger.Error(err)
		return err
	}

	return nil
}

// GetClaimLogs gets claim logs using the history package.
// args = [userID, claimEpisode, startTimestamp, endTimestamp, prevValue, latestOnly, maxNum]
// Pass "" for fields if not used
// Pass 0 for timestamps if not used
// Default for maxNum is 20
func GetClaimLogs(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) {
	defer utils.ExitFnLogger(logger, utils.EnterFnLogger(logger))
	logger.Debugf("args: %v", args)

	if len(args) < 7 {
		custom_err := &custom_errors.LengthCheckingError{Type: "GetClaimLogs arguments length"}
		logger.Errorf(custom_err.Error())
		return nil, errors.New(custom_err.Error())
	}

	// ==============================================================
	// Validation
	// ==============================================================

	userID := args[0]
	claimEpisode := args[1]

	startTimestamp, err := strconv.ParseInt(args[2], 10, 64)
	if err != nil {
		logger.Errorf("Error converting startTimestamp to type int64")
		return nil, errors.Wrap(err, "Error converting startTimestamp to type int64")
	}

	if startTimestamp <= 0 {
		startTimestamp = -1
	}

	endTimestamp, err := strconv.ParseInt(args[3], 10, 64)
	if err != nil {
		logger.Errorf("Error converting endTimestamp to type int64")
		return nil, errors.Wrap(err, "Error converting endTimestamp to type int64")
	}

	if endTimestamp <= 0 {
		endTimestamp = -1
	}

	prevValue := args[4]

	latestOnly := args[5]
	if latestOnly != "true" && latestOnly != "false" {
		logger.Errorf("Error: Latest only flag must be true or false")
		return nil, errors.New("Error: Latest only flag must be true or false")
	}

	maxNum, err := strconv.ParseInt(args[6], 10, 64)
	if err != nil {
		logger.Errorf("Error converting maxNum to type int")
		return nil, errors.Wrap(err, "Error converting maxNum to type int")
	}

	if maxNum < 0 {
		logger.Errorf("Max num must be greater than 0")
		return nil, errors.New("Max num must be greater than 0")
	}

	if maxNum == 0 {
		maxNum = 20
	}

	// ==============================================================
	// GetLogs
	// ==============================================================

	assetManager := asset_mgmt.GetAssetManager(stub, caller)
	historyManager := history.GetHistoryManager(assetManager)

	rulesMap := make(map[string]interface{})
	var userRule map[string]interface{}
	if !utils.IsStringEmpty(userID) {
		userRule = simple_rule.R("==", simple_rule.R("var", "private_data.field_1"), userID)
		rulesMap["userRule"] = userRule
	}
	var makeRule map[string]interface{}
	if !utils.IsStringEmpty(claimEpisode) {
		makeRule = simple_rule.R("==", simple_rule.R("var", "private_data.field_2"), claimEpisode)
		rulesMap["makeRule"] = makeRule
	}

	// combine rules
	andPredicate := simple_rule.R("and")
	for _, ruleComponent := range rulesMap {
		if ruleComponent != nil {
			andPredicate["and"] = append(andPredicate["and"].([]interface{}), ruleComponent)
		}
	}
	filterRule := simple_rule.NewRule(andPredicate)

	var logs []data_model.TransactionLog

	if !utils.IsStringEmpty(userID) {
		logs, _, err = historyManager.GetTransactionLogs("claim", "field_1", userID, startTimestamp, endTimestamp, prevValue, int(maxNum), &filterRule, LogKeyFunc)
	} else if !utils.IsStringEmpty(claimEpisode) {
		logs, _, err = historyManager.GetTransactionLogs("claim", "field_2", claimEpisode, startTimestamp, endTimestamp, prevValue, int(maxNum), &filterRule, LogKeyFunc)
	}

	// if latest only flag is set to true, then only return the last element
	if latestOnly == "true" && len(logs) > 0 {
		logs = logs[len(logs)-1:]
	}

	resultBytes, err := json.Marshal(&logs)

	logger.Debugf("result: %v %v", len(logs), string(resultBytes))
	return resultBytes, err
}

// LogKeyFunc returns a key path from a caller to the log sym key.
// To find a valid key path, the caller must be either AppAdmin (auditor of this example) or the user who created the log.
var LogKeyFunc asset_key_func.AssetKeyPathFunc = func(stub cached_stub.CachedStubInterface, caller data_model.User, asset data_model.Asset) ([]string, error) {
	// 1. if caller is auditor AppAdmin
	logKeyPath := []string{caller.GetPubPrivKeyId(), asset.AssetKeyId}
	logger.Debugf("callerID: %v, logKeyPath: %v", caller.ID, logKeyPath)
	ok, err := key_mgmt.VerifyAccessPath(stub, logKeyPath)
	if ok && err == nil {
		return logKeyPath, nil
	}

	// 2. if caller is the user who created log
	logKeyPath = []string{caller.GetPubPrivKeyId(), caller.GetSymKeyId(), asset.AssetKeyId}
	logger.Debugf("callerID: %v, logKeyPath: %v", caller.ID, logKeyPath)
	ok, err = key_mgmt.VerifyAccessPath(stub, logKeyPath)
	if ok && err == nil {
		return logKeyPath, nil
	}

	logger.Debug("Failed to get logKeyPath")
	return nil, nil
}
