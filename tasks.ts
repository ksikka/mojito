/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');
import _ = require('lodash');

import Parsing = require('./parsing');

module Tasks {
  function fmtNum(num: number): number { return Math.round(num * 10) / 10;}

  function getTaskDuration(task: asana.Task, expectedTagType?: string): Parsing.Duration {
    var tags: Array<Parsing.Duration> = Parsing.parseTags(task.name);
    expectedTagType = expectedTagType || (task.completed ? 'A' : 'E');
    var taskDuration = tags.filter((t) => t.tagType === expectedTagType)[0];
    // If no tag type, the duration is both expected and actual.
    taskDuration = taskDuration || tags.filter((t) => !t.tagType)[0];
    return taskDuration;
  }

  function minutes(duration: Parsing.Duration): number {
    return (60 * (duration.hours || 0)) + ((duration.minutes || 0));
  }

  export function processProject(project: asana.Project, tasks: Array<asana.Task>) {
    var projectDuration: Parsing.Duration = Parsing.parseTags(project.name)[0];
    if (!projectDuration) return;

    // For this project, how many hours have I done this week, and how many do I have left?
    // % completed?

    var completedTasks: Array<asana.Task> = tasks.filter((t) => t.completed);
    var incompletedTasks: Array<asana.Task> = tasks.filter((t) => !t.completed);

    var minutesCompleted = _.sum(
      completedTasks
        .filter((t) => Boolean(getTaskDuration(t)))
        .map((t) => minutes(getTaskDuration(t)))
    );
    var hoursCompleted = minutesCompleted / 60;
    var hoursRemaining = minutes(projectDuration) / 60 - hoursCompleted
    var percentCompletion = 100 * minutesCompleted / minutes(projectDuration);

    // Project aggregate stats
    //   - completed tasks
    //   - incomplete tasks with time duration until plan satisfied
    // Warnings?
    //   ?No incomplete tasks with time duration, but N tasks without time estimates
    //   ?There are N completed tasks with time estimates but not actual times.

    console.log(`\n${project.name}: ${fmtNum(percentCompletion)}% completed. ${fmtNum(hoursCompleted)} hours down, ${fmtNum(hoursRemaining)} to go.`);
    _.sortBy(completedTasks, (t) => new Date(t.completed_at).valueOf()).forEach((t) => console.log(`  ✓ ${t.name}`));
    var _minutesRemaining: number = minutes(projectDuration) - minutesCompleted;
    incompletedTasks.forEach((task) => {
      if (_minutesRemaining > 0) {
        var taskDuration: Parsing.Duration = getTaskDuration(task);
        if (taskDuration) {
          console.log(`  ☐ ${task.name}`);
          _minutesRemaining -= minutes(taskDuration)
        }
      }
    });

    var warnings: Array<string> = [];

    var numIncompletedTasksWithDuration = incompletedTasks.filter((t) => Boolean(getTaskDuration(t))).length;
    var numIncompletedTasksWithoutDuration = incompletedTasks.length - numIncompletedTasksWithDuration;

    if (numIncompletedTasksWithDuration === 0) {
      if (numIncompletedTasksWithoutDuration > 0) {
        warnings.push(`No tasks left with time estimates, but ${numIncompletedTasksWithoutDuration} incomplete tasks exist.`);
      } else {
        warnings.push(`No tasks left with time estimates.`);
      }
    }

    var numCompletedTasksForgettingActualTimes = completedTasks.filter((t) => getTaskDuration(t, 'E') && !getTaskDuration(t, 'A')).length;
    if (numCompletedTasksForgettingActualTimes > 0) {
      warnings.push(`Found ${numCompletedTasksForgettingActualTimes} completed tasks with Estimates but not Actual times.`);
    }

    if (warnings.length > 0) {
      console.log('  Warnings:');
      warnings.forEach((w) => console.log('    - '+w));
    }
  }

}

export = Tasks;
