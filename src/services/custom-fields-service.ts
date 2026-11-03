
export interface ProjectDefaultValue {
  projectId: string;
  status: "VISIBLE" | "INVISIBLE";
  value?: string | number | boolean | null | string[];
}

interface CustomFieldValueBase {
  id?: string;
  customFieldId: string;
  name: string;
  timeEntryId: string;
  allowedValues: string[];
  description: string | null;
  entityType: "TIMEENTRY" | "USER";
  onlyAdminCanEdit: boolean;
  placeholder: string;
  projectDefaultValues: ProjectDefaultValue[];
  required: boolean;
  status: "VISIBLE" | "INVISIBLE";
  tempValue: string | number | boolean | null | string[];
  type:
    | "TXT"
    | "NUMBER"
    | "LINK"
    | "CHECKBOX"
    | "DROPDOWN_SINGLE"
    | "DROPDOWN_MULTIPLE";
  value?: string | number | boolean | null | string[];
  workspaceDefaultValue?: string | number | boolean | null | string[];
  workspaceId: string;
}

interface PostCustomFieldValue extends CustomFieldValueBase {
  customFieldId: string;
  value: string | number | boolean | string[] | null;
  name: string;
  timeEntryId: string;
  type:
    | TextCustomFieldValue["type"]
    | NumberCustomFieldValue["type"]
    | LinkCustomFieldValue["type"]
    | CheckboxCustomFieldValue["type"]
    | DropdownSingleCustomFieldValue["type"]
    | DropdownMultipleCustomFieldValue["type"];
}

interface TextCustomFieldValue extends CustomFieldValueBase {
  type: "TXT";
  value: string;
}

interface NumberCustomFieldValue extends CustomFieldValueBase {
  type: "NUMBER";
  value: number;
}

interface LinkCustomFieldValue extends CustomFieldValueBase {
  type: "LINK";
  value: string;
}

interface CheckboxCustomFieldValue extends CustomFieldValueBase {
  type: "CHECKBOX";
  value: boolean;
}

interface DropdownSingleCustomFieldValue extends CustomFieldValueBase {
  type: "DROPDOWN_SINGLE";
  value: string;
}

interface DropdownMultipleCustomFieldValue extends CustomFieldValueBase {
  type: "DROPDOWN_MULTIPLE";
  value: string[];
}

export type CustomField =
  | TextCustomFieldValue
  | NumberCustomFieldValue
  | LinkCustomFieldValue
  | CheckboxCustomFieldValue
  | DropdownSingleCustomFieldValue
  | DropdownMultipleCustomFieldValue
  | PostCustomFieldValue;

class CustomFieldsService {
}

export default CustomFieldsService;
