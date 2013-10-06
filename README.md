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
cd frontend-src
npm install
grunt build
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
- Old status app from Eike Frost 
- Backend structure idea from André König (andre.koenig@gmail.com)


## Dev
Start the status app in debug mode:
```
cd server
node backend/app.js
```
In debug mode, the app will
* use the `frontend-src/app` directory instead of `server/frontend/`
* add `connect-livereload` to auto reload the current page (with help from the running grunt script)
* log everything on debug level

Addionally, you should start the grunt script to get the livereload feature on file change (in frontend-source):
```
cd frontend-src
grunt live
```

### ToDos
- [ ] Calculate a proper Rain value by using the delta Value of the last X Minutes. (A delta of 1 means 0,3 mm rain.)

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
