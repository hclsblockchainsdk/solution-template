## Deploying solution tempalate to IBP 2.0
This section explains how to deploy solution template claim application to IBP 2.0.

#### Change config.js
Edit the following line in `server.js` to point to the `config.json` in `server\config\ibp_v2.0`:
```
var config_file = path.join(__dirname, 'config','ibp_v2.0','config.json');
```

#### Package chaincode into Chaincode Deployment Spec (CDS) format
This will package the chaincode to cds file `claim@v1.0.cds` in `chaincodes\src\` folder:

```
cd network_local_HF
./byfn.sh cds -m claim -r v1.0 -f docker-compose-cli-only.yaml -y
```
You will see a message like the following when everything is successfule:
```
========= All GOOD, BYFN execution completed =========== 


 _____   _   _   ____   
| ____| | \ | | |  _ \  
|  _|   |  \| | | | | | 
| |___  | |\  | | |_| | 
|_____| |_| \_| |____/  

```

#### Deploy cds package file to IBP 2.0
[Follow these instructions](https://cloud.ibm.com/docs/services/blockchain?topic=blockchain-ibp-console-smart-contracts) to install and instantiate cds package you generated in the previous step.
In order to set default Cloudant off-chainstore, make sure to input following arguments in to the text box when prompted when you instantiate or upgrade the chaincode:
```
Function name: init
Arguments: _loglevel, DEBUG, _cloudant, 0d993c4d-efd0-49f4-a653-a33c2492f405-bluemix, 2844a1f42798f0e8282f2a77424d779632f08088475068f6013b7f9b17234999, claim, https://0d993c4d-efd0-49f4-a653-a33c2492f405-bluemix.cloudantnosqldb.appdomain.cloud
```

#### Set Environment variables and run NodeJs App.
You also need set following Environment variables to be used as arguments for `invoke setup`:

```
export CLOUDANT_USERNAME=TODO
export CLOUDANT_PASSWORD=TODO
export CLOUDANT_HOST=TODO
cd server
node server.js
```

#### Access UI
Once you see this:
```
[INFO] app.js: - ------------------------------------------------
[INFO] app.js: -  SERVER READY
[INFO] app.js: - ------------------------------------------------
```
you can access the UI at `localhost:3000` and the swagger APIs at `localhost:3000/api-docs`. 

Login creds:
- As app admin `AppAdmin/Org1/mychannel : pass0`. 
- As app Hao `Hao/Org1/mychannel : pass0`. 
- As app Alex `Alex/Org1/mychannel : pass0`. 
- As app Bonnie `Bonnie/Org1/mychannel : pass0`. 

**Note:** Make sure that you use `Org1` as cdrtificate organization for all users.
