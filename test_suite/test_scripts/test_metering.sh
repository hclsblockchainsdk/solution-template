#!/bin/bash
# Adds rows to the metering DB. Number of rows depends on number of peers to write and read from
echo -------------------------

start=1
end=100

val=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Alex' --header 'password: pass0' --header 'login-org: Org2' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
token=${val:53:64}
echo "$val"
echo "$token"

for i in `seq $start $end`; do
    date=`expr $i % 31 + 1`
    count=`expr $i % 200`
    if [ "$count" = "0" ]
    then
        val=$(curl -X GET --header 'Accept: application/json' --header 'user-id: Alex' --header 'password: pass0' --header 'login-org: Org2' --header 'login-channel: mychannel' 'http://localhost:3000/common/api/v1/login')
        token=${val:53:64}
        echo "$val"
        echo "$token"
    fi

    echo "Adding claim $i"
    curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' --header 'token: '$token -d '{ "claim_id": "'$i'-a", "episode": "Lasik", "payer": "Bank1", "provider": "Hospital1", "update_date": "2019/03/'$date'", "data": {"small": "datadatadatadatadatadatadata"} }' 'http://localhost:3000/solution/api/v1/claims'
    
    echo

    prevClaim=`expr $i - 1`
    if [ "$prevClaim" != "0" ]
    then
        echo "Reading claim $prevClaim"
        curl -X GET --header 'Accept: application/json' --header 'token: '$token "http://localhost:3000/solution/api/v1/claims/$prevClaim-a"
    fi
    echo
done

echo Done.