/// <reference path="./typings/tsd.d.ts"/>

import asana = require('asana');
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

    var mProjects = Object.keys(projects).map((projectId: string): MProject => {
      return projects[projectId];
    });

    mProjects.forEach((project: MProject) => {
      console.log('');
      console.log('Project: ' + project.name);
      //console.log(tasks);
      console.log('Completed: ' + project.tasks.filter((t) => t.completed).length);
      console.log('Remaining: ' + project.tasks.filter((t) => !t.completed).length);
    });
  })
  .done();
