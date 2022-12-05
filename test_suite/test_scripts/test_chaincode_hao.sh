#!/bin/bash
echo -------------------------
echo test chaincode

start=1
end=9999

val0=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Hao' --header 'password: pass0' --header 'login-org: Org1' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
token0=${val0:51:64}
echo "$val0"
echo "$token0"

for i in `seq $start $end`; do
    echo "$i"
    date0=`expr $i % 31 + 1`
    count0=`expr $i % 200`
    if [ "$count0" = "0" ]
    then
        val0=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Hao' --header 'password: pass0' --header 'login-org: Org1' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
        token0=${val0:51:64}
        echo "$val0"
        echo "$token0"
    fi
    curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'token: '$token0 -d '{ "claim_id": "'$i'-h", "episode": "Physical", "payer": "Bank2", "provider": "Hospital2", "update_date": "2019/01/'$date0'" }' 'http://localhost:3000/solution/api/v1/claims'
    echo
done


echo Done.
