'use strict';

var apiUtils = require(('../apiUtils.js'));
var data = require('../../components/data');
require('date-utils');

var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
// in this year we started
var START_YEAR = 2012;


function outputJson(res, slots) {
  var data = {};
  var yearToday = new Date().getFullYear();

  var years = [];
  for (var y = START_YEAR; y <= yearToday; y++) {
    years.push(y);
    data[y] = slots.getSlotsForYear(y);
  }
  data.years = years;

  // remove all slots newer than today
  var dayToday = new Date().getOrdinalNumber();
  data[yearToday] = data[yearToday].slice(0, dayToday);

  apiUtils.sendJson(res, 200, data);
}

function buildSlots(results) {
  var normalizedEntries = normalizeResults(results);
  // console.log(normalizedEntries);
  var slots = new Slots();

  for (var i = 0; i < normalizedEntries.length; i++) {
    // find day slot for begin
    var begin = normalizedEntries[i].begin;
    var beginYear = begin.getFullYear();
    var beginDay = begin.getOrdinalNumber();

    var beginDayEnd = new Date(begin.getFullYear(), begin.getMonth(), begin.getDate(), 23, 59, 59, 999);
    var beginDayRemaining = beginDayEnd.getTime() - begin.getTime();
    if (normalizedEntries[i].duration < beginDayRemaining) {
      // the end is on the same day
      slots.incrementDaySlot(beginYear, beginDay, getDayBasedTs(begin), normalizedEntries[i].duration);
    } else {
      // the end is at the following day...
      // fill up the current day
      slots.incrementDaySlot(beginYear, beginDay, getDayBasedTs(begin), beginDayRemaining);

      // ... how many days?
      var remainingForNextDays = normalizedEntries[i].duration - beginDayRemaining;
      // util.log('remainingForNextDays: ' + remainingForNextDays);
      // set time for full days (somehow unlikely that we had this case...)
      var moreDays = Math.floor(remainingForNextDays / MILLIS_PER_DAY);
      // util.log('moreDays: ' + moreDays);
      for (var d = 0; d < moreDays; d++) {
        slots.incrementDaySlot(beginYear, beginDay + d + 1, 0, MILLIS_PER_DAY);
      }
      // add the remaining
      var remaining = remainingForNextDays % MILLIS_PER_DAY;
      // util.log('remaining: ' + remaining);
      slots.incrementDaySlot(beginYear, beginDay + moreDays + 1, 0, remaining);
    }
  } // end for

  return slots;
}

/**
 * Get the ts in ms for the given year and day.
 *
 * @param year
 *          the full year, e.g. 2012
 * @param dayIndex
 *          the day, based on 0 (e.g. the first day in a year is 0!).
 */
//function getTsForDayInYear(year, dayIndex) {
//  return new Date(year, 0, 1).getTime() + (MILLIS_PER_DAY * dayIndex);
//}

/**
 * Gets the hour, minute, second and ms part of the date in ms.
 *
 * @param date
 */
function getDayBasedTs(date) {
  var h = date.getHours() * 60 * 60 * 1000;
  var m = date.getMinutes() * 60 * 1000;
  var s = date.getSeconds() * 1000;
  return h + m + s + date.getMilliseconds();
}

function printSlotsForDebug(slots) {
  var yearToday = new Date().getFullYear();
  for (var year = START_YEAR; year <= yearToday; year++) {
    var entries = slots.getSlotsForYear(year);
    for (var d = 0; d < entries.length; d++) {
      var minutes = Math.round(entries[d] / 1000 / 60);
//      console.log(year + '//' + d + ': ' + minutes);
    }
  }
}

/**
 * rules: - use the first 'off' and ignore any following ones - use the first
 * 'on' and ignore any following ones
 *
 * @param sqlResults
 * @returns {Array}
 */
function normalizeResults(sqlResults) {
  var normalizedEntries = [];
  // on == true, off == false
  var lastState = false;
  var lastEntry = {};
  for (var i = 0; i < sqlResults.length; i++) {
    // closing is also true
    var state = isOpenState(sqlResults[i].state);
    if (lastState === state) {
      // util.log('double state, ignoring id ' + sqlResults[i].id);
      continue;
    }

    if (state) {
      lastEntry = {
        begin: sqlResults[i].timestamp,
        end: null,
        duration: 0
      };
      normalizedEntries.push(lastEntry);
    } else {
      lastEntry.end = sqlResults[i].timestamp;
      lastEntry.duration = lastEntry.end.getTime() - lastEntry.begin.getTime();
    }

    lastState = state;
  }

  return normalizedEntries;
}

function isOpenState(strState) {
  // new and open states
  return strState === 'on' || strState === 'closing' || strState === 'open+' || strState === 'open';
}

function Slots() {
  var NAME_DURATION = 'd';
  var NAME_BEGIN = 'b';

  var yearMap = {};

  var self = this;

  this.hasSlotsForYear = function (year) {
    return yearMap[year] !== undefined;
  };

  this.getSlotsForYear = function (year) {
    if (!yearMap[year]) {
      yearMap[year] = createYear(year);
    }
    return yearMap[year];
  };

  /**
   * supports 365/366 + X days!
   *
   * @param year
   *          e.g. 2012
   * @param day
   *          the day (1-xxxx)
   * @param beginForDayInMs
   *          the time in ms (for the passed day) when the duration starts
   */
  this.incrementDaySlot = function (year, day, beginForDayInMs, value) {
    var slots = self.getSlotsForYear(year);
    var index = day - 1;
    if (index < 0) {
      throw new Error('Invalid day param: ' + day);
    }
    if (index < slots.length) {
      var duration = getDurationForSlot(slots[index]);
      if (duration + value > MILLIS_PER_DAY) {
        throw new Error('Can´t add the value `' + value + '` for slot index ' + index + 'year ' + year + ' would be too big.');
      }
      var entry = {};
      entry[NAME_BEGIN] = beginForDayInMs;
      entry[NAME_DURATION] = value;
      slots[index].push(entry);
      return;
    }
    // find the next year
    var dayMinusOneYear = day - slots.length;
    self.incrementDaySlot(year + 1, dayMinusOneYear, beginForDayInMs, value);
  };

  function getDurationForSlot(slot) {
    var duration = 0;
    for (var i = 0; i < slot.length; i++) {
      duration += slot[i][NAME_DURATION];
    }
    return duration;
  }

  function createYear(year) {
    var days = Date.isLeapYear(year) ? 366 : 365;
    var a = [];
    for (var i = 0; i < days; i++) {
      a.push([]);
    }
    return a;
  }
}


exports.index = function(req, res) {
  data.db.getAllOpenStates('space', function (err, results) {
    if (err) {
      apiUtils.sendJson(res, 500, { status: 'error', msg: 'SQL problems'});
      return;
    }

    var slots = buildSlots(results);

    // printSlotsForDebug(slots);
    outputJson(res, slots);
  });
};