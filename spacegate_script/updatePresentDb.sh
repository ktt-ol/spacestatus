#!/bin/sh

# DEBUG VERSION
#UPDATE_URL=http://localhost:7996/api/spaceDevices
UPDATE_URL=https://status.kreativitaet-trifft-technik.de/api/spaceDevices
PASSWORD=test

# DEBUG VERSION
# MAC_LIST=$(cat sample.data | grep -v 'IP' | awk '{printf "\"%s\",", $4}')
MAC_LIST=$(cat /proc/net/arp | grep -v 'IP' | awk '{printf "\"%s\",", $4}')

JSON_START="{\"devices\":["
JSON_END="]}"

DATA="${JSON_START} ${MAC_LIST%?} ${JSON_END}"
echo $DATA > dataToSend
RESULT=$(curl -s -k -H "Authorization: $PASSWORD" -H "Accept: application/json" -H "Content-type: application/json" -X PUT -d @dataToSend "$UPDATE_URL")
STATUS=$(echo $RESULT | grep -c ok)
echo $STATUS
