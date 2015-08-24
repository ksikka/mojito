/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');

var client = asana.Client.create().useBasicAuth('/* YOUR SECRET KEY HERE */');

var WORKSPACE_ID: number = 498346170860;
var MAX_LIMIT: number = 100;

var user: asana.User;


client.users.me()
  .then((me: asana.User) => {
    user = me;
    // :TODO: check if WORKSPACE_ID exists in user.workspaces
    console.log(`Welcome, ${user.name}. Fetching your projects and tasks...`);
    return client.projects.findAll({
      archived: false,
      workspace: WORKSPACE_ID,
      limit: MAX_LIMIT
    })
    .then((projects: asana.Collection<asana.Project>) => {
      return projects.fetch();
    });
  })
  .then((projects: Array<asana.Project>) => {
    var projectTasksPromises: Array<Promise<Array<asana.Task>>> = projects.map((project: asana.Project) => {
      return client.tasks.findAll({
        assignee: user.id,
        project: project.id,
        fields: ['assignee_status', 'complete'],
        limit: MAX_LIMIT
      })
        .then((projects: asana.Collection<asana.Project>) => {
          return projects.fetch();
        });
    });
    return [];
  })
  .then((tasks: Array<asana.Task>) => {
    for (var task of tasks) {
      console.log(task);
    }
  })
  .done();

