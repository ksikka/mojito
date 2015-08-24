/// <reference path="./typings/tsd.d.ts"/>

module Parsing {
  var numberRegex = '[0-9]*\.?[0-9]+';
  var hourRegex = `(${numberRegex})H`;
  var minuteRegex = `(${numberRegex})M`;
  var hourMinuteRegex = `${hourRegex}\\s*:?\\s*${minuteRegex}`;
  var tagRegex = (timeRegex: string): string => `\\[([EA]:)?\\s*${timeRegex}\\s*\\]`;

  export interface Duration {
    tagType?: string; // E or A
    hours?: number;
    minutes?: number;
  }

  function parseTag(s: string): Duration {
    /*
    Tests:

    console.log( Parsing.parseTag('[3h]') );
    console.log( Parsing.parseTag('[3.3h]') );
    console.log( Parsing.parseTag('[.3h]') );
    console.log( Parsing.parseTag('[.3m]') );
    console.log( Parsing.parseTag('[3h.3m]') );
    console.log( Parsing.parseTag('[3h:.3m]') );
    console.log( Parsing.parseTag('[3h : .3m]') );
    console.log( Parsing.parseTag('[E:3h:.3m]') );
    console.log( Parsing.parseTag('[E: 3h:.3m]') );
    console.log( Parsing.parseTag('[E: 1h]') );
    console.log( Parsing.parseTag('[E: 30m]') );

    { hours: 3 }
    { hours: 3.3 }
    { hours: 0.3 }
    { minutes: 0.3 }
    { hours: 3, minutes: 0.3 }
    { hours: 3, minutes: 0.3 }
    { hours: 3, minutes: 0.3 }
    { hours: 3, minutes: 0.3, tagType: 'E' }
    { hours: 3, minutes: 0.3, tagType: 'E' }
    { hours: 1, tagType: 'E' }
    { minutes: 30, tagType: 'E' }
    */

    s = s.toUpperCase();
    var hasHour = s.indexOf('H') > 0;
    var hasMinute = s.indexOf('M') > 0;
    var result;

    var duration: Duration = null;

    if (hasHour && !hasMinute) {
      result = new RegExp(tagRegex(hourRegex)).exec(s);
      if (result) {
        duration = { hours: parseFloat(result[2]) };
        if (result[1]) { duration.tagType = result[1][0]; } // keep the first char }
      }
    } else if (hasMinute && !hasHour) {
      result = new RegExp(tagRegex(minuteRegex)).exec(s);
      if (result) {
        duration = { minutes: parseFloat(result[2]) };
        if (result[1]) { duration.tagType = result[1][0]; } // keep the first char }
      }
    } else if (hasHour && hasMinute) {
      result = new RegExp(tagRegex(hourMinuteRegex)).exec(s);
      if (result) {
        duration = {
          hours: parseFloat(result[2]),
          minutes: parseFloat(result[3])
        };
        if (result[1]) { duration.tagType = result[1][0]; } // keep the first char }
      }
    }
    return duration;
  }

  export function parseTags(s): Array<Duration> {
    var notTagDelim = '[^\\[\\]]';
    var tagsRegex = new RegExp(`(\\[${notTagDelim}+\\])`, 'g');
    var result = tagsRegex.exec(s);
    var durations = [];
    while (result) {
      var parsed = parseTag(result[1]);
      if (parsed) {
        durations.push(parsed);
      }
      result = tagsRegex.exec(s);
    }
    return durations;
  }
}

export = Parsing;
