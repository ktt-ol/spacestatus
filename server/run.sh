#!/bin/sh

# move to the script folder
cd `dirname $0`

# switch the app into production mode
export NODE_ENV=production

echo "Starting status..."

SCRIPTPATH=`pwd -P`
node $SCRIPTPATH/app.js $*