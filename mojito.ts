/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');

import Tasks = require('./tasks');

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
          Tasks.processProject(project, tasks);
          return tasks;
        });
    });
  })
  .all()
  .done();
