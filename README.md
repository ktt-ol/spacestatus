# Space Status

Shows the status about our hackspace using nodejs and a mysql server.

## Features
* rest api
* pushing new events with html server side events
* Snows (rest or homepage)
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

## Credits
- Main author: Holger Cremer (HolgerCremer@gmail.com)
- Old status app from Eike Frost 
- Old Backend structure idea from André König (andre.koenig@gmail.com)


## Dev
Start the status app in debug mode:
```
grunt serve
```

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
