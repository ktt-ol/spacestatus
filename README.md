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
```
create a new config based on the template
```
cp server/conf/config-template.js server/conf/config.js
vim server/conf/config.js
```

## Run
Start the server with
```
cd server
./run.sh logs/out.log
```
The first parameter of the script is a log file for the console output of the application. You find the normal logs in ```server/logs```.

## Credits
- Main author: Holger Cremer (HolgerCremer@gmail.com)
- Old statu app from Eike Frost 
- Backend structure idea from André König (andre.koenig@gmail.com)


## Dev

### ToDos
- [x] better 'public' folder position,
- [x] Legacy API for space switch
- [ ] Documentation for REST api
- [x] Show amount of people in space
- [x] specify people in space
- [x] finish the xmpp module
- [x] run test with `npm test`
- [x] spacegate script
- [ ] update README (authors, etc.)


### Unit testing
Just run
```
npm test
```

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
