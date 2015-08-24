/// <reference path="./typings/tsd.d.ts"/>

module Parsing {
  var numberRegex = '[0-9]*\.?[0-9]+';
  var hourRegex = `(${numberRegex})h`;
  var minuteRegex = `(${numberRegex})m`;
  var hourMinuteRegex = `${hourRegex}\\s*:?\\s*${minuteRegex}`;
  var tagRegex = (timeRegex: string): string => `\\[([EA]:)?\\s*${timeRegex}\\s*\\]`;

  export interface Duration {
    tagType?: string; // E or A
    hours?: number;
    minutes?: number;
  }

  export function parseTag(s: string): Duration {
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

    { hours: 3 }
    { hours: 3.3 }
    { hours: 0.3 }
    { minutes: 0.3 }
    { hours: 3, minutes: 0.3 }
    { hours: 3, minutes: 0.3 }
    { hours: 3, minutes: 0.3 }
    { hours: 3, minutes: 0.3, tagType: 'E' }
    { hours: 3, minutes: 0.3, tagType: 'E' }
    */

    var hasHour = s.indexOf('h') > 0;
    var hasMinute = s.indexOf('m') > 0;
    var result;

    if (hasHour && !hasMinute) {
      result = new RegExp(tagRegex(hourRegex)).exec(s);
      if (result) {
        return { hours: parseFloat(result[2]) };
      }
    } else if (hasMinute && !hasHour) {
      result = new RegExp(tagRegex(minuteRegex)).exec(s);
      if (result) {
        return { minutes: parseFloat(result[2]) };
      }
    } else if (hasHour && hasMinute) {
      result = new RegExp(tagRegex(hourMinuteRegex)).exec(s);
      if (result) {
        var duration: Duration = {
          hours: parseFloat(result[2]),
          minutes: parseFloat(result[3])
        };
        if (result[1]) {
          duration.tagType = result[1][0]; // keep the first char
        }
        return duration;
      }
    }
    return null;
  }
}

export = Parsing;
