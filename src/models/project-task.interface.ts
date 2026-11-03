export interface ProjectTask {
    task: Task;
    project: Project;
}

interface Task {
    id: string;
    assigneeIds: string[];
    billable: true;
    budgetEstimate: number;
    costRate: any;
    estimate: string;
    favorite: boolean;
    hourlyRate: any;
    name: string;
    progress: any;
    status: string;
    userGroupIds: string[];
    workspaceId: string;
    projectId: string;
}

interface Project {
    id: string;
    client: Client;
    tasks: any[];
    archived: boolean;
    billable: boolean;
    billableDuration: string;
    billableTime: number;
    budget: number;
    budgetEstimate: any;
    clientId: string;
    color: string;
    costRate: any;
    currency: any;
    duration: string;
    entriesProgress: any;
    estimate: any;
    estimateReset: any;
    expenseBillableAmount: number;
    expenseNonBillableAmount: number;
    expensesProgress: any;
    favorite: boolean;
    hourlyRate: any;
    name: string;
    memberships: any[];
    workspaceId: string;
    timeEstimate: {
        active: boolean;
        estimate: string;
        includeNonBillable: boolean;
        resetOption: any;
        type: string;
    };
    template: boolean;
}

interface Client {
    address: any;
    archived: boolean;
    currencyId: string;
    email: string;
    id: string;
    name: string;
    note: string;
    workspaceId: string;
}

export enum PermissionEntity {
    EVERYONE = "EVERYONE",
    ADMINS = "ADMINS",
    ADMINS_AND_PROJECT_MANAGERS = "ADMINS_AND_PROJECT_MANAGERS"
}