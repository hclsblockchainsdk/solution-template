# Tutorials

If this is your first experience with writing chaincode by using Hyperledger, review this documentation to get a proper introduction to chaincode and the Hyperledger Smart Contract concept: 

https://hyperledger-fabric.readthedocs.io/en/release-1.4/  

The following tutorials guide you through the end to end development of a smart contract using the HCLS SDK.

## Navigating to the chaincode files

Chaincode is the mechanism for implementing smart contracts in Hyperledger. To navigate to the chaincode files in the Solution Template, run the following command:

```
cd solution-template/chaincodes/src/solution_chaincode
```

In this location there is a chaincode.go file, which contains the implementation of the Chaincode Interface including the Init and Invoke functions. You also see the `solution-template/chaincodes/src/solution_chaincode/vendor/solution/claim` directory which contains the smart contracts for the claim application. This directory is where you implement your own smart contracts.

## Writing a new smart contract

Smart contracts perform transactions on the blockchain. In this tutorial, the smart contract that you create is a simple function that adds a claim to the ledger. 

To write a new smart contract, complete the following steps: 

1. Navigate to the claim package and open `claim.go`.

```
Note: Notice the two smart contracts in this file that are already implemented. They are valuable examples for you to refer to in the future:
- PutClaim()
- GetClaimPage()
```

2. To create a simple function that adds a test claim to the ledger, insert the following code to the end of `claim.go`.

```
func CreateTestClaim(stub cached_stub.CachedStubInterface, caller data_model.User, args []string) ([]byte, error) { 

    // Create test claim    
    claim := Claim{ 
        ClaimID:     "test_claim_1",
        Episode:	 "Surgery", 
        Payer:	 "Payer 1", 
        Provider:	 “Hospital 1”, 
        UpdateDate: 1544832000, 
    }

    // Add datatype symkey for the "claim" datatype + caller 

    // If the datatype symkey already exists, it will 

    // simply return the existing key. It's good practice to call 

    // AddDatatypeSymKey before adding new asset in order 

    // to make sure that datatype symkey exists. 

    _, err := datatype.AddDatatypeSymKey(stub, caller, "claim", caller.ID) 

    if err != nil { 
        err = errors.Wrap(err, "Failed to add datatype key for claim datatype and caller") 
        logger.Error(err) 
        return nil, err 
    } 

    // Convert claim to asset  
    asset := convertToAsset(claim) 
    assetManager := asset_mgmt.GetAssetManager(stub, caller) 

    // Encrypt the asset w/ the caller's sym key  
    assetKey := caller.GetSymKey() 
    return nil, assetManager.AddAsset(asset, assetKey, false)
}
```

Now, you have a new function that is called CreateTestClaim, which adds a claim that is called `test_claim_1` to the ledger. You must be able to execute this function as a transaction on the blockchain. 

To invoke this function as a transaction on the blockchain, the function must be handled in the `Invoke` function: 

1. To handle the test claim function in the `Invoke` function, open `chaincode.go`. 

2. Find the `Invoke()` function. Inside the `Invoke()` function, there is a list of function handlers.

3. Add a function handler for the `CreateTestClaim` function. Below `addClaim`, include the following code.

```
} else if function == "createTestClaim" { 
    // get cached stub from chaincode stub, enabling putCache 
    // because adding datatype key and put asset will be in the same transaction 
    stub2 := cached_stub.NewCachedStub(chaincodeStub, true, true, true) 
    returnBytes, returnError = claim.CreateTestClaim(stub2, caller, args) 
} 
```

This allows the chaincode interface to call your function when it is invoked with the function name that is specified in the handler, which in this case is createTestClaim. 

You have now successfully implemented a new smart contract that adds a single claim asset to the ledger.

## Creating a REST API and connecting it to the new smart contract

Now that you have created a new smart contract in the chaincode, you must create a REST API to call the smart contract. 

To create a REST API to call the smart contract, complete the following steps: 

1. Navigate to `solution-template/server/routes` and open `rest_api.js`. This file contains the REST API end points. 

Add a REST API endpoint to the new smart contract by inserting the following code at the end of the `rest_api.js` file.

```
/** 
*	@swagger 
*	/solution/api/v1/claims/tutorial: 
*	post: 
*	tags: 
*	- Claims 
*	description: "A simple API that performs an invoke on the blockchain" 
*	produces: 
*	- application/json 
*	parameters: 
*	- name: token 
*	in: header 
*	description: login token 
*	required: false 
*	type: string 
*	format: string 
*	- name: signature 
*	in: header 
*	description: user signature 
*	required: false 
*	type: string 
*	format: string 
*	security: 
*	- basicAuth: [] 
*/ 

router.route('/claims/tutorial').post(function(req, res) {  
    var data = { 
        type: ‘createTestClaim’ 
    }
    solution_req_handler.process_api(data, req, res); 
}); 
```

Notice in the code for the REST API endpoint, that the request handler is called. You must add a request handler function for the new REST API endpoint. 

2. Add a request handler function. Navigate to `solution_template/server` and open `solution_api_handler.js`.

3. Find the `process_api(data, req,  res)` function.  Inside the `process_api` function, there is a list of function handlers. Below `addClaim`, add the request handler function by using the following code.

```
} else if (data.type == 'createTestClaim') {  
    createTestClaimApiHandler(caller, data, req, res); 
} 
```

Add the `createTestClaimApiHandler(caller, data, req, res)` function to handle the request to the new `createTestClaim` API. 

4. In this case, to handle the request to the new `createTestClaim` API, call `solution_chaincode_ops.js` to invoke the chaincode. Add the handler code, shown below, just above the `process_api(data, req, res)` function.

```
function createTestClaimApiHandler(caller, data, req, res) { 
    logger.debug(‘createTestClaim'); 

    solutionChaincodeOps.createTestClaim(caller, function(err, result) { 
        if (err != null) { 
            var errmsg = "createTestClaim error"; logger.error(errmsg, err);
            let statusAndMsg = convertErrorFromJson(err);
            res.status(statusAndMsg.status).json({ 'msg': statusAndMsg.msg }); 
        } else { 
            res.status(201).append('tx_id',result.tx_id).append(‘Location',`${req.originalUrl}`).json(result); 
        } 
    }); 
}
```

Now, you must make the connection from Node.js to the chaincode.

5. To make the connection, navigate to `solution_template/server` and open `solution_chaincode_ops.js`.

6. Just below the `getClaims(caller, limit, lastKey, cb)` function, add the following code to call the chaincode.

```
/** 
 * Add claim 
 * @param caller The user submitting the transaction. 
*/ 

module.exports.createTestClaim = createTestClaim;
function createTestClaim (caller, cb) {
    logger.debug(“Create test claim”);
    
    var fcn = "createTestClaim";
    var args = [];
    
    chaincodeOps._invoke(caller, fcn, args, function(err, result) {
        if(err) { 
            var errmsg = "Failed to create test claim";
            logger.error(errmsg, err);
            try { 
                cb && cb(err); 
            } catch(err) { 
                logger.error(util.format("callback for "+fcn+" failed: error: %s", err)); 
            } 
        } else { 
            logger.debug('Created test claim successfully:', result);
            try { 
                cb && cb(null, result); 
            } catch(err) { 
                logger.error(util.format("callback for "+fcn+" failed: error: %s", err));
            } 
        } 
    }); 
}; 
```

```
Note: In this case, the smart contract is an invoke because it needs to perform a write operation.  You call the invoke(caller, fcn, args, cb) function to call the chaincode in an invoke context.  If the smart contract is performing only reads, you call the  chaincode in a query context. For query context, call the query(caller, fcn, args, cb) function instead of the invoke(caller, fcn, args, cb) function.  See the getClaims(caller, limit, lastKey, cb) function for a query example.  Note that the args that are passed into the query or invoke functions must be in string form.  Numbers and other types must be converted to strings.  Further, the function name that is passed into the invoke and query functions must match the function names that we see in the Invoke function in chaincode.go, which was modified earlier.  In our case, the function name is createTestClaim.
```

## Testing the new smart contract

Now that you have a smart contract exposed through the REST API and served by the Node.js application, try it out and see if it works.

To test the new smart contract, complete the following steps: 

1. Restart the Node.js server to apply all the changes that are made to Node.js code and chaincode by running the following commands: 

```
cd solution-template/scripts
./restart.sh server
```

If your host machine is linux based, use the following commands: 

```
cd solution-template/scripts 
./restart.sh no_cloudant_mapping 
```

2. Navigate to `https://localhost` in your browser and log in as AppAdmin with the password `pass0`. Remember to use the format of `user_id/ca_org/channel`. Note: If you are using Docker Toolkit on Microsoft Windows 7, navigate to: `https://192.168.99.100`

The Dashboard opens and shows no rows (unless you previously created claims).

3. Next, use  Swagger  to  run  the  new  REST API. Navigate  to  the  Swagger  page  by typing `https://localhost/api-docs` in your browser. Click the `Claims`  tab and then click the new API endpoint that has the path: `/solution/api/v1/claims/tutorial`.

Note: If you are using Docker Toolkit on Microsoft Windows 7, navigate to: `https://192.168.99.100/api-docs`

4. Now, authenticate your ID by clicking the small red icon at the right of the window. Then, authenticate by using the same credentials that you used to log in to the web application:

User name: `AppAdmin/Org1/mychannel`

Password: `pass0`

5. Click `Try it out!` at the lower left of the page. A success message is displayed for authentication.

6. Return to the Dashboard and refresh the page. The Dashboard should reflect that a claim was added to the ledger.

Congratulations! You have written a smart contract and successfully exposed it by using a REST API. To learn and try more, review and explore the other two example Claim REST APIs. The implementation for these REST APIs is in the same files that were used in this tutorial. Then attempt the next step by trying to call your REST API from the React application. The files for the React application can be found in the following directory: `solution-template/src`

## Debugging the chaincode

As you are developing the chaincode, it is helpful to build the code before running the Node.js server. If you run the Node.js server and there is a compile error in your chaincode, the server fails to start and shows the errors. However, it is much faster to perform the build directly on your Go code.

When building and testing your Go code, make sure to use the `--tags nopkcs11` option. To do so, navigate to `solution_template/chaincodes/src/solution_chaincode` and run the following commands: 

`go test ./… --tags nopkcs11 -vet=off`

Logs and print statements can be helpful when debugging your chaincode. To view your logging output, you must obtain the Docker logs from the chaincode container. To view the chaincode logs run the following command: 

`docker ps` 

which will give you a list of the peer containers, then choose any peer container and run: 

`docker logs -f <peer container ID>`

## Additional notes on writing chaincode

In general, writing chaincode is no different from any other Golang project. However, there are a few key points to remember when writing chaincode:

- **Checking transaction is committed**:  When you get a success message from invoke() in chaincodeOps() or chain_helper(), it only guarantees that the transaction was evaluated successfully and will be committed. It does not guarantee that the transaction has already been committed to the ledger. So, if you have to submit two transactions and the second transaction depends on the first transaction, you have to make sure to check that first transaction has been successfully committed to the ledger before sending the second transaction. 

- **Read after write**: Within the chaincode, you can read and write from the ledger state database. It is important to note that if you write to a key in the state database, you cannot read that value within the same transaction. For example, if the initial state of the database has a key/value pair of `{"key1": "abc"}`, then reading from "key1" will result in retrieving the value, "abc". If a new value of "def" is written to "key1" and then a read is done on "key1" within the same transaction, you can expect to read the value "abc". The reason that you do not see the value that you wrote earlier in the same transaction is that changes to the ledger state database are not committed until after consensus is reached by the network, which happens after chaincode runtime execution. 

- **Query context in contrast to invoke context**: In the chaincode, code is executed in one of two contexts. The context is determined by which fabric node SDK function is used to call the chaincode. For details about using the SDK to call the chaincode, refer “Writing a new smart contract”. It is import to note that in a query context, you cannot write anything to the state database.

- **Avoid non-determinism**: It is a preferred practice to avoid committing non-deterministic artifacts to the state database because they can cause issues with reaching consensus. Avoid generating time stamps, cryptographic keys, and randomized data inside of the chaincode if it affects what gets committed to the state database. Instead, generate these artifacts in Node.js and pass them into the chaincode as arguments. 