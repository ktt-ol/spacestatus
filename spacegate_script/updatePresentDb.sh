#!/bin/sh

# DEBUG VERSION
#UPDATE_URL=http://localhost:7996/api/spaceDevices
UPDATE_URL=https://status.kreativitaet-trifft-technik.de/api/spaceDevices
PASSWORD=test

listArp() {
    /usr/sbin/arp -i br0  | grep -v -E '\(incomplete\)|Address' | while read line
    do
        IP=$(echo $line | awk '{printf "%s", $1}')
        # we use the ip to ping in order to get a ARP packet for ping (and not some icmp)
        # and we send 3 packets, because sometimes a packet get lost
        PONG=$(/usr/sbin/arping -r -i br0 -c 3 $IP | uniq)
        if [ "$PONG" != "" ]; then
            echo -n "\"$PONG\","
        fi
    done
}

MAC_LIST=$(listArp)

JSON_START="{\"devices\":["
JSON_END="]}"
DIR=$(dirname $0)

DATA="${JSON_START} ${MAC_LIST%?} ${JSON_END}"
echo $DATA > $DIR/dataToSend
RESULT=$(/usr/bin/curl -s -k -H "Authorization: $PASSWORD" -H "Accept: application/json" -H "Content-type: application/json" -X PUT -d @${DIR}/dataToSend "$UPDATE_URL")
# echo $RESULT
STATUS=$(echo $RESULT | grep -c ok)
#echo $STATUS
