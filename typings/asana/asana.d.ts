// Type definitions for asana 0.9.1
// Project: https://github.com/Asana/node-asana
// Definitions by: Karan Sikka <https://github.com/ksikka>

/// <reference path="../bluebird/bluebird.d.ts"/>
/// <reference path="../node/node.d.ts"/>


declare module 'asana' {
  export interface ResourceResponse {
    id?: number;
  }

  export interface Project extends ResourceResponse {
    name: string;
  }

  export interface Task extends ResourceResponse {
    assignee_status?: string;
    completed?: boolean;
    completed_at: string; // ISO 8601
    created_at: string; // ISO 8601
    name?: string;
  }

  export interface Workspace extends ResourceResponse {
    name?: string;
    is_organization?: boolean;
  }

  export interface User extends ResourceResponse {
    email?: string;
    name?: string;
    photo?: any;
    workspaces?: Array<Workspace>;
  }

  export interface Collection<T> {
    data: Array<T>;
    nextPage: () => Promise<Collection<T>>;
    fetch: () => Promise<Array<T>>;
    stream: () => NodeJS.ReadableStream;
  }

  export interface Resource<T> {
    findById(id: number, params?: any, dispatchOptions?: any): Promise<T>;
    findAll(params: any, dispatchOptions?: any): Promise<Collection<T>>;
  }

  export interface UserResource extends Resource<User> {
    me: (params?: any, dispatchOptions?: any) => Promise<any>;
  }

  export interface WorkspaceResource extends Resource<Workspace> {
  }

  export interface TaskResource extends Resource<Task> {
  }

  export interface ProjectResource extends Resource<Project> {
  }

  export class Client {
    static create(options?): Client;

    users: UserResource;
    tasks: TaskResource;
    projects: ProjectResource;
    workspaces: WorkspaceResource;

    useBasicAuth(apiKey: string): Client;
  }
}
