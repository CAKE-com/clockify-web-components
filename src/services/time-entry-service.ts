import ApiService from "./api-service";
import EndpointService from "./endpoint-service";
import UserService from "./user-service";
import NotificationService from "./notification-service";
import type { Tag } from "./tag-service";
import type { CustomField } from "./custom-fields-service";

export enum EmitType {
  EMIT_EVENT_ONLY = "EMIT_EVENT_ONLY",
  SYNC_ON_CHANGE = "SYNC_ON_CHANGE",
}

export type TimeEntry = {
  "id": string,
  "description": string,
  "tags": Tag[],
  "projectId": string,
  "projectName": string,
  "projectColor": string,
  "clientId": string,
  "clientName": string,
  "taskId": string,
  "taskName": string,
  "projectBillable": boolean,
  "billableBasedOnCurrentTaskAndProject": boolean,
  "customFieldValues": CustomField[]
}

class TimeEntryService {

  static async getTimeEntry(timeEntryId: string, workspaceId: string, endpoint?: string, token?: string) {
    const activeWorkspace = workspaceId || await UserService.getActiveWorkspace();
    const ep = endpoint || await EndpointService.getEndpoint();
    if (!ep || !activeWorkspace || !timeEntryId) {
      return;
    }

    return ApiService.get({ endpoint: `${ep}/v1/workspaces/${activeWorkspace}/time-entries/${timeEntryId}`, token }).catch(error => {
      NotificationService.error(error);
    });
  }

  static async getRecent(limit: number = 8) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/recent?limit=${limit}`;
    if(!endpoint || !activeWorkspace) {
      return {};
    }
    try {
      return await ApiService.get({ endpoint: url });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async searchTimeEntries(search: string = "") {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries?searchValue=${search}`;
    if(!endpoint || !activeWorkspace) {
      return {};
    }
    try {
      return await ApiService.get({ endpoint: url });
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async updateProject(timeEntryId: string, body: BodyInit) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/${timeEntryId}/project`;
    if(!endpoint || !activeWorkspace) {
      return {};
    }
    try {
      const timeEntry = await ApiService.put({ endpoint: url, body });
      NotificationService.success("Project updated successfully", timeEntry);
      return timeEntry;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async updateProjectAndTask(timeEntryId: string, body: BodyInit) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/${timeEntryId}/projectAndTask`;
    if(!endpoint || !activeWorkspace || !timeEntryId) {
      return {};
    }
    try {
      const timeEntry = await ApiService.put({ endpoint: url, body });
      NotificationService.success("Project and task updated successfully", timeEntry);
      return timeEntry;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async removeProject(timeEntryId: string) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/${timeEntryId}/project/remove`;
    if(!endpoint || !activeWorkspace || !timeEntryId) {
      return {};
    }
    try {
      const timeEntry = await ApiService.delete({ endpoint: url });
      NotificationService.success("Project removed successfully", timeEntry);
      return timeEntry;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async updateCustomField(timeEntryId: string, body: BodyInit) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/${timeEntryId}/custom-field`;
    if(!endpoint || !activeWorkspace || !timeEntryId) {
      return {};
    }
    try {
      const timeEntry = await ApiService.put({ endpoint: url, body });
      NotificationService.success("Custom field updated successfully", timeEntry);
      return timeEntry;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async updateBillable(timeEntryId: string, body: BodyInit) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/${timeEntryId}/billable`;
    if(!endpoint || !activeWorkspace || !timeEntryId) {
      return {};
    }
    try {
      const timeEntry = await ApiService.put({ endpoint: url, body });
      NotificationService.success("Billable status updated successfully", timeEntry);
      return timeEntry;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }

  static async updateTags(timeEntryId: string, body: BodyInit) {
    const activeWorkspace = await UserService.getActiveWorkspace();
    const endpoint = await EndpointService.getEndpoint();
    const url = `${endpoint}/workspaces/${activeWorkspace}/timeEntries/${timeEntryId}/tags`;
    if(!endpoint || !activeWorkspace || !timeEntryId) {
      return {};
    }
    try {
      const timeEntry = await ApiService.put({ endpoint: url, body });
      NotificationService.success("Tags updated successfully", timeEntry);
      return timeEntry;
    } catch (error: any) {
      NotificationService.error(error);
    }
  }
}

export default TimeEntryService;