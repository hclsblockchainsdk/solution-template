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
	"github.com/hyperledger/fabric/core/chaincode/shim"
)

var logger = shim.NewLogger("main")

// ============================================================================================================================
// Main
// ============================================================================================================================
func main() {
	// set log level to INFO by default
	logger.SetLevel(shim.LogInfo)
	shim.SetLoggingLevel(shim.LogInfo)

	// start chaincode
	logger.Info("----starting chaincode----")
	err := shim.Start(new(Chaincode))
	if err != nil {
		logger.Errorf("Error starting chaincode - %v", err)
		panic(err)
	}
}
