/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');
import _ = require('lodash');

import Parsing = require('./parsing');

var client = asana.Client.create().useBasicAuth('/* YOUR SECRET KEY HERE */');

var WORKSPACE_ID: number = 498346170860;
var MAX_LIMIT: number = 100;

var user: asana.User;

interface MProject {
  id: number;
  name: string;
  tasks: Array<asana.Task>;
}

client.tasks.findAll({
  workspace: WORKSPACE_ID,
  assignee: 'karan@heapanalytics.com',
  opt_fields: 'name,assignee_status,completed,completed_at,projects,projects.name',
  limit: MAX_LIMIT
})
  .then((result) => result.fetch())
  .then((tasks: Array<asana.Task>) => {
    var projects: {[projectId: string]: MProject} = {};

    tasks.forEach((asanaTask: asana.Task) => {
      asanaTask.projects.forEach((asanaProject: asana.Project) => {
        if (!projects[asanaProject.id.toString()]) {
          projects[asanaProject.id.toString()] = {
            id: asanaProject.id,
            name: asanaProject.name,
            tasks: []
          };
        }
        projects[asanaProject.id.toString()].tasks.push(asanaTask);
      });
    });

    _.values(projects).forEach((project: MProject) => {
      var tasks: Array<asana.Task> = project.tasks;

      console.log('\nProject: ' + project.name);

      for (var task of tasks) {
        console.log(`${task.completed ? '☑' : '☐' } ${task.name}`);
      }

      // console.log('Completed: ' + project.tasks.filter((t) => t.completed).length);
      // console.log('Remaining: ' + project.tasks.filter((t) => !t.completed).length);
    });
  })
  .done();
