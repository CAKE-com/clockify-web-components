import { DEFAULT_LOCALES, type LocalizationData } from "./constants";
import LocalizationService from "../services/localization-service";

export function getEntityLabel(
  label: string,
  plural: boolean = false,
): string {
  if (!label) return "";
  const lowLabel = label?.toLowerCase();
  const lang = LocalizationService.resolveLang();
  const loaded = LocalizationService.getLocalization(lang) || {};
  const l: LocalizationData = { ...DEFAULT_LOCALES, ...loaded };
  switch(lowLabel) {
    case "client":
      return plural ? l.CLIENTS_LABEL : l.CLIENT_LABEL;
    case "department":
      return plural ? l.DEPARTMENTS_LABEL : l.DEPARTMENT_LABEL;
    case "category":
      return plural ? l.CATEGORIES_LABEL : l.CATEGORY_LABEL;
    case "project":
      return plural ? l.PROJECTS_LABEL : l.PROJECT_LABEL;
    case "location":
      return plural ? l.LOCATIONS_LABEL : l.LOCATION_LABEL;
    case "job":
      return plural ? l.JOBS_LABEL : l.JOB_LABEL;
    case "task":
      return plural ? l.TASKS_LABEL : l.TASK_LABEL;
    case "activity":
      return plural ? l.ACTIVITIES_LABEL : l.ACTIVITY_LABEL;
    case "job area":
      return plural ? l.JOB_AREAS_LABEL : l.JOB_AREAS_LABEL;
    case "tag":
      return plural ? l.TAGS_LABEL : l.TAG_LABEL;
    default:
      return label;
  }
}