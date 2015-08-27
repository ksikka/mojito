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

          var getTaskDuration: (task: asana.Task) => Parsing.Duration = (task) => {
            var tags: Array<Parsing.Duration> = Parsing.parseTags(task.name);
            var taskDuration;
            if (task.completed) {
              taskDuration = tags.filter((t) => t.tagType === 'A')[0];
            } else {
              taskDuration = tags.filter((t) => t.tagType === 'E')[0];
            }
            taskDuration = taskDuration || tags.filter((t) => !t.tagType)[0];
            return taskDuration;
          };

          var printTaskLines = (tasks: Array<asana.Task>) => {
            var timeLeft: number = minutes(projectDuration);

            var completeTasks: Array<asana.Task> = _.filter(tasks, (t) => t.completed);
            completeTasks = _.sortBy(completeTasks, (t) => new Date(t.completed_at).valueOf());
            for (var task of completeTasks) {
              console.log(`  ${task.completed ? '✓' : '☐' } ${task.name}`);

              var taskDuration: Parsing.Duration = getTaskDuration(task);

              if (taskDuration) {
                timeLeft -= minutes(taskDuration);
              }
            }


            var incompleteTasks: Array<asana.Task> = _.filter(tasks, (t) => !t.completed);
            for (var task of incompleteTasks) {
              if (timeLeft < 0) break;
              var taskDuration: Parsing.Duration = getTaskDuration(task);

              if (taskDuration) {
                console.log(`  ☐ ${task.name}`);
                timeLeft -= minutes(taskDuration);
              }
            }
          };

          var oldTasksLength = tasks.length
          tasks = _.filter(tasks, (t) => getTaskDuration(t));
          var numTasksWithoutDuration = oldTasksLength - tasks.length;

          var completeTasks: Array<asana.Task> = _.filter(tasks, (t) => t.completed);

          // For this project, how many hours have I done this week, and how many do I have left?
          // % completed?

          var minutesCompleted = _.sum(_.map(completeTasks, (t) => minutes(getTaskDuration(t))));
          var hoursCompleted = minutesCompleted / 60;
          var hoursRemaining = minutes(projectDuration) / 60 - hoursCompleted
          var percentCompletion = 100 * minutesCompleted / minutes(projectDuration);

          function fmtNum(num: number): number { return Math.round(num * 10) / 10;}

          console.log(`\n${project.name}: ${fmtNum(percentCompletion)}% completed. ${fmtNum(hoursCompleted)} hours down, ${fmtNum(hoursRemaining)} to go.`);
          if (tasks.length === 0) {
            if (numTasksWithoutDuration === 0) {
              console.log(`  (No tasks found.)`);
            } else {
              console.log(`  (No tasks found, but ${numTasksWithoutDuration} have no time estimate.)`);
            }
          } else {
            printTaskLines(tasks);
          }

          return tasks;
        });
    });
  })
  .all()
  .done();
