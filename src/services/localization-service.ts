import EndpointService from "./endpoint-service";
import NotificationService from "./notification-service";
import UserService from "./user-service";
import type { LocalizationData } from "../utils/constants";

export function extractTranslations(localizationData: any): LocalizationData{
  const SHARED_MODULES = localizationData['SHARED_MODULES'];
  const GLOBAL = localizationData['GLOBAL'];
  const SERVICES = localizationData["SERVICES"];
  const CLIENT = SERVICES["CLIENT"];
  const PROJECT = SERVICES["PROJECT"];
  const PROJECTS = localizationData['PROJECTS'];
  const TIMESHEET2 = localizationData['TIMESHEET2'];
  const TRACKER = localizationData['TRACKER'];
  return {
    ...SHARED_MODULES["PROJECT_PICKER"],
    ...SHARED_MODULES["TAG_DROPDOWN"],
    ...PROJECTS["FILTER_DROPDOWN"],
    ...PROJECTS["NEW_PROJECT"],
    TASK_PROJECT_CUSTOM_PLACEHOLDER: TIMESHEET2["SHARED"]["TASK_PROJECT_CUSTOM_PLACEHOLDER"],
    CREATE_NEW_CUSTOM_LABEL: SHARED_MODULES["SHARED"]["CREATE_NEW_CUSTOM_LABEL"],
    CREATE_CUSTOM_LABEL: SHARED_MODULES["SHARED"]["CREATE_CUSTOM_LABEL"],
    CREATE_ENTITY_LABEL: GLOBAL["CREATE_ENTITY_LABEL"],
    CREATE_ENTITY_LABEL_2: PROJECTS["SHARED"]["CREATE_ENTITY_LABEL_2"],
    ENTER_CUSTOM_NAME_PLACEHOLDER: PROJECTS["SHARED"]["ENTER_CUSTOM_NAME_PLACEHOLDER"],
    ADD_FIND_PLACEHOLDER_LABEL: GLOBAL["ADD_FIND_PLACEHOLDER_LABEL"],
    SEARCH_PLACEHOLDER_LABEL: GLOBAL["SEARCH_PLACEHOLDER_LABEL"],
    ADD_SEARCH_PLACEHOLDER_LABEL: GLOBAL["ADD_SEARCH_PLACEHOLDER_LABEL"],
    START_TYPING_LABEL: GLOBAL["START_TYPING_LABEL"],
    SELECT_LABEL: GLOBAL["SELECT_LABEL"],
    CANCEL_BTN: GLOBAL["CANCEL_BTN"],
    PUBLIC_LABEL: GLOBAL["PUBLIC_LABEL"],
    WITHOUT_CUSTOM_LABEL: GLOBAL["WITHOUT_CUSTOM_LABEL"],
    NO_LABEL_WITH_PARAM: SHARED_MODULES["SHARED"]["NO_LABEL_WITH_PARAM"],
    CREATE_LABEL: GLOBAL["CREATE_LABEL"],
    SAVE_LABEL: GLOBAL["SAVE_LABEL"],
    FAVORITES_LABEL: GLOBAL["FAVORITES_LABEL"],
    CLIENT_LABEL: GLOBAL["CLIENT_LABEL"],
    CLIENTS_LABEL: GLOBAL["CLIENTS_LABEL"],
    DEPARTMENT_LABEL: GLOBAL["DEPARTMENT_LABEL"],
    DEPARTMENTS_LABEL: GLOBAL["DEPARTMENTS_LABEL"],
    CATEGORY_LABEL: GLOBAL["CATEGORY_LABEL"],
    CATEGORIES_LABEL: GLOBAL["CATEGORIES_LABEL"],
    PROJECT_LABEL: GLOBAL["PROJECT_LABEL"],
    PROJECTS_LABEL: GLOBAL["PROJECTS_LABEL"],
    LOCATION_LABEL: GLOBAL["LOCATION_LABEL"],
    LOCATIONS_LABEL: GLOBAL["LOCATIONS_LABEL"],
    JOB_LABEL: GLOBAL["JOB_LABEL"],
    JOBS_LABEL: GLOBAL["JOBS_LABEL"],
    TASK_LABEL: GLOBAL["TASK_LABEL"],
    TASKS_LABEL: GLOBAL["TASKS_LABEL"],
    ACTIVITY_LABEL: GLOBAL["ACTIVITY_LABEL"],
    ACTIVITIES_LABEL: GLOBAL["ACTIVITIES_LABEL"],
    JOB_AREA_LABEL: GLOBAL["JOB_AREA_LABEL"],
    JOB_AREAS_LABEL: GLOBAL["JOB_AREAS_LABEL"],
    TAG_LABEL: GLOBAL["TAG_LABEL"],
    TAGS_LABEL: GLOBAL["TAGS_LABEL"],
    SEARCH_TAGS_PLACEHOLDER_LABEL: SHARED_MODULES["TAG_DROPDOWN"]["SEARCH_PLACEHOLDER_LABEL"],
    TRACK_PLACEHOLDER: TRACKER["TIME_TRACKER"]["ENTRY"]["TRACK"]["PLACEHOLDER"]["TIMER"],
    BILLABLE_LABEL: GLOBAL["BILLABLE_LABEL"],
    NON_BILLABLE_LABEL: GLOBAL["NON_BILLABLE_LABEL"],
    CLIENT_CREATE_SUCCESS_MESSAGE: CLIENT["CREATE"]["SUCCESS_MESSAGE"],
    PROJECT_CREATE_SUCCESS_MESSAGE: PROJECT["CREATE"]["SUCCESS_MESSAGE"],
  };
}

class LocalizationService {
  private static localization: Record<string, LocalizationData> = {};

  static updateStorage(lang: string, data: LocalizationData) {
    this.localization[lang] = data;
  }

  static resolveLang(): string {
    const supported = new Set(["fr", "de", "pt", "es", "en"]);
    let raw;
    try {
      const docLang = typeof document !== "undefined" ? document.documentElement?.lang : "";
      raw = (docLang || UserService.getLang() || navigator?.language || "en").toLowerCase();
    } catch (_) {
      raw = (UserService.getLang() || "en").toLowerCase();
    }
    raw = raw.trim().replace(/_/g, "-");
    const base = raw.split("-")[0];
    return supported.has(base) ? base : "en";
  }

  static async fetchLocalization() {
    try{
      const endpoint = await EndpointService.getEndpoint();
      if(!endpoint) return;
      const lang = LocalizationService.resolveLang();
      const request = await fetch(`${endpoint.replace(/\/api\/?$/, "")}/assets/localization/${lang}.json`);
      const data = await request.json();
      this.updateStorage(lang, extractTranslations(data));
    } catch (error: any) {
      NotificationService.error(error);
      return '';
    }
  }

  static getLocalization(lang: string) {
      return this.localization[lang];
  }
}

export default LocalizationService;