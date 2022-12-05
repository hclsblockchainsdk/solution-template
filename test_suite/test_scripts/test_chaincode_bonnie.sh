#!/bin/bash
echo -------------------------
echo test chaincode

start=1
end=9999

val3=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Bonnie' --header 'password: pass0' --header 'login-org: Org2' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
token3=${val3:57:96}
echo "$val3"
echo "$token3"

for i in `seq $start $end`; do
    echo "$i"
    date3=`expr $i % 31 + 1`
    count3=`expr $i % 200`
    if [ "$count3" = "0" ]
    then
        val3=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Bonnie' --header 'password: pass0' --header 'login-org: Org2' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
        token3=${val3:57:96}
        echo "$val3"
        echo "$token3"
    fi
    curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'token: '$token3 -d '{ "claim_id": "'$i'-b", "episode": "Surgery", "payer": "Bank3", "provider": "Hospital3", "update_date": "2019/05/'$date3'" }' 'http://localhost:3000/solution/api/v1/claims'
    echo
done
