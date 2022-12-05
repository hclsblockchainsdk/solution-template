#!/bin/bash
echo -------------------------
echo test chaincode

start=1
end=9999

val2=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Alex' --header 'password: pass0' --header 'login-org: Org2' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
token2=${val2:53:64}
echo "$val2"
echo "$token2"

for i in `seq $start $end`; do
    echo "$i"
    date2=`expr $i % 31 + 1`
    count2=`expr $i % 200`
    if [ "$count2" = "0" ]
    then
        val2=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Alex' --header 'password: pass0' --header 'login-org: Org2' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
        token2=${val2:53:64}
        echo "$val2"
        echo "$token2"
    fi
    curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'token: '$token2 -d '{ "claim_id": "'$i'-a", "episode": "Lasik", "payer": "Bank1", "provider": "Hospital1", "update_date": "2019/03/'$date2'" }' 'http://localhost:3000/solution/api/v1/claims'
    echo
done

echo Done.
