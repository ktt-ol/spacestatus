# Space Status

Shows the status about our hackspace using nodejs and a mysql server.

## Features
* rest api
* pushing new events with html server side events
* Shows (rest or homepage)
    * open state (on/off/closing)
    * People/devices in the space
    * Freifunk status
    * weather


## Install

Checkout the repo, run
```
npm install
bower install
grunt build
```

create a new config based on the template
```
cp server/config/environment/index-template.js server/config/environment/index.js
vim server/config/environment/index.js
```

## Docker

See the readme in the docker directory for more information.

## People/Devices

This part has been migrated (and upgraded) to a new project on github: [spaceDevices](https://github.com/smilix/spaceDevices)

## Run
Copy the ```dist/``` folder to your server. Install and start the server with
```
# only once needed
npm install --production
# run
cd server
./run.sh logs/out.log
```
The first parameter of the script is a log file for the console output of the application. You find the normal logs in ```server/logs```.


## Dev
Start the status app in debug mode:
```
grunt serve
```

## MQTT
Used to get space status updates and publishes changes. For the main door or the Space in general we have the following states:
* none      - space is closed, nobody must be inside
* keyholder - space is closed, keyholder is inside
* member    - space is open, but only for members
* open      - space is open, guests may ring the bell
* open+     - space is open, everyone can open the door


### ToDos
- [ ] Calculate a proper Rain value by using the delta Value of the last X Minutes. (A delta of 1 means 0,3 mm rain.)


## Stats Page
I'm using the following chart enginge on the stats page:

* http://www.amcharts.com/javascript-charts/
* http://docs.amcharts.com/javascriptcharts/

## Misc

### npm install issues on Mac OS

#### Building node-xmpp

Only after
```
sudo xcode-select --switch /
```
npm was able to build node-xmpp.

Switch back:
```
sudo xcode-select --switch /Library/Developer/
```

#### Building node-stringprep
See: https://github.com/astro/node-stringprep
don't use it, it's optional
