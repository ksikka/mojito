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

          var timeLeft: number = minutes(projectDuration);

          console.log('\nProject: ' + project.name);

          for (var task of tasks) {
            if (timeLeft < 0) break;
            var tags: Array<Parsing.Duration> = Parsing.parseTags(task.name);
            var estDuration: Parsing.Duration,
                actDuration: Parsing.Duration,
                taskDuration: Parsing.Duration;

            if (task.completed) {
              actDuration = tags.filter((t) => t.tagType === 'A')[0];
              taskDuration = actDuration;
            } else {
              estDuration = tags.filter((t) => t.tagType === 'E')[0];
              estDuration = estDuration || tags.filter((t) => !t.tagType)[0];
              taskDuration = estDuration;
            }
            if (taskDuration) {
              console.log(`${task.completed ? '☑' : '☐' } ${task.name}`);
              timeLeft -= minutes(taskDuration);
            }
          }
          // console.log('Completed: ' + tasks.filter((t) => t.completed).length);
          //console.log('Remaining: ' + tasks.filter((t) => !t.completed).length);
          return tasks;
        });
    });
  })
  .all()
  .done();
