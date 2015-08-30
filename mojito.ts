/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');

import Tasks = require('./tasks');

var client = asana.Client.create().useBasicAuth('/* YOUR SECRET KEY HERE */');

var WORKSPACE_ID: number = 498346170860;
var MAX_LIMIT: number = 100;

var NOW: Date = new Date();
var START_TIME: Date = new Date(
  NOW.getFullYear(),
  NOW.getMonth(),
  NOW.getDate() - NOW.getDay() // Sunday of this week.
);
var WEEKS_BACK = parseInt(process.argv[2]) || 0;
var WEEK_MS = 7*24*60*60*1000;
START_TIME = new Date(START_TIME.getTime() - WEEKS_BACK * WEEK_MS);
var END_TIME: Date = new Date(START_TIME.getTime() + WEEK_MS);

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
    console.log('Fetching your projects\' tasks...');
    return projects.map((project: asana.Project): Promise<Array<asana.Task>> => {
      return client.tasks.findAll({
        assignee: user.id,
        project: project.id,
        opt_fields: 'name,assignee_status,completed,completed_at,created_at',
        limit: MAX_LIMIT
      })
        .then((tasks: asana.Collection<asana.Task>): Promise<Array<asana.Task>> => tasks.fetch())
        .then((tasks: Array<asana.Task>) => {
          tasks = tasks.filter((t) => {
            if (t.completed) {
              var completedTime: number = new Date(t.completed_at).getTime();
              return START_TIME.getTime() <= completedTime && completedTime < END_TIME.getTime();
            } else {
              return new Date(t.created_at).getTime() < END_TIME.getTime();
            }
          });
          Tasks.processProject(project, tasks);
          return tasks;
        });
    });
  })
  .all()
  .done();
