/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');
import _ = require('lodash');

import Parsing = require('./parsing');

var client = asana.Client.create().useBasicAuth('/* YOUR SECRET KEY HERE */');

var WORKSPACE_ID: number = 498346170860;
var MAX_LIMIT: number = 100;

var user: asana.User;

client.users.me()
  .then((me: asana.User) => {
    user = me;
    // :TODO: check if WORKSPACE_ID exists in user.workspaces
    console.log(`Welcome, ${user.name}. Fetching your projects...`);
    // :HACK: Can't use `client.projects.findAll` - https://github.com/Asana/node-asana/issues/74
    return (<any>client).dispatcher.get(`/workspaces/${WORKSPACE_ID}/projects`)
      .then((projects: {data: Array<asana.Project>}) => projects.data);
  })
  .then((projects: Array<asana.Project>): Array<Promise<Array<asana.Task>>> => {
    console.log('Fetching your projects\' tasks..');
    return projects.map((project: asana.Project): Promise<Array<asana.Task>> => {
      return client.tasks.findAll({
        assignee: user.id,
        project: project.id,
        opt_fields: 'name,assignee_status,completed,completed_at',
        limit: MAX_LIMIT
      })
        .then((tasks: asana.Collection<asana.Task>): Promise<Array<asana.Task>> => tasks.fetch())
        .then((tasks: Array<asana.Task>) => {
          function minutes(duration: Parsing.Duration): number {
            return (60 * (duration.hours || 0)) + ((duration.minutes || 0));
          }

          var projectDuration: Parsing.Duration = Parsing.parseTags(project.name)[0];
          if (!projectDuration) return;

          var getTaskDuration: (task: asana.Task, expectedTagType?: string) => Parsing.Duration = (task, expectedTagType?: string) => {
            var tags: Array<Parsing.Duration> = Parsing.parseTags(task.name);
            expectedTagType = expectedTagType || (task.completed ? 'A' : 'E');
            var taskDuration = tags.filter((t) => t.tagType === expectedTagType)[0];
            // If no tag type, the duration is both expected and actual.
            taskDuration = taskDuration || tags.filter((t) => !t.tagType)[0];
            return taskDuration;
          };

          // For this project, how many hours have I done this week, and how many do I have left?
          // % completed?

          var completedTasks: Array<asana.Task> = _.filter(tasks, (t) => t.completed);
          var incompletedTasks: Array<asana.Task> = _.filter(tasks, (t) => !t.completed);

          var minutesCompleted = _.sum(_.map(completedTasks, (t) => minutes(getTaskDuration(t) || 0)));
          var hoursCompleted = minutesCompleted / 60;
          var hoursRemaining = minutes(projectDuration) / 60 - hoursCompleted
          var percentCompletion = 100 * minutesCompleted / minutes(projectDuration);

          function fmtNum(num: number): number { return Math.round(num * 10) / 10;}

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

          var numIncompletedTasksWithDuration = _.filter(incompletedTasks, (t) => getTaskDuration(t)).length;
          var numIncompletedTasksWithoutDuration = incompletedTasks.length - numIncompletedTasksWithDuration;

          if (numIncompletedTasksWithDuration === 0) {
            if (numIncompletedTasksWithoutDuration > 0) {
              warnings.push(`No tasks left with time estimates, but ${numIncompletedTasksWithoutDuration} incomplete tasks exist.`);
            } else {
              warnings.push(`No tasks left with time estimates.`);
            }
          }

          var numCompletedTasksForgettingActualTimes = _.filter(completedTasks, (t) => getTaskDuration(t, 'E') && !getTaskDuration(t, 'A')).length;
          if (numCompletedTasksForgettingActualTimes > 0) {
            warnings.push(`Found ${numCompletedTasksForgettingActualTimes} completed tasks with Estimates but not Actual times.`);
          }

          if (warnings.length > 0) {
            console.log('  Warnings:');
            warnings.forEach((w) => console.log('    - '+w));
          }

          return tasks;
        });
    });
  })
  .all()
  .done();
