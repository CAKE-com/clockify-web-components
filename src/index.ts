export { ClockifyWebComponentsApp } from "./clockify-app";

// clockify special components
export { ClockifySelect } from "./components/clockify-select";
export { ClockifyProjectPicker } from "./components/clockify-project-picker";
export { ClockifyCustomFields } from "./components/clockify-custom-fields";
export { ClockifyTags } from "./components/clockify-tags";
export { ClockifyBillable } from "./components/clockify-billable";
export { ClockifyDescription } from "./components/clockify-description";

// generic components
export { ClockifyDrawer } from "./components/clockify-drawer";
export { ClockifyDropdown } from "./components/clockify-dropdown";
export { ClockifySwitch } from "./components/clockify-switch";
export { ClockifyMenu } from "./components/clockify-menu";
export { ClockifyMenuItem } from "./components/clockify-menu-item";
export { ClockifyInput } from "./components/clockify-input";
export { ClockifyButton } from "./components/clockify-button";
export { ClockifyCheckbox } from "./components/clockify-checkbox";
export { ClockifyTag } from "./components/clockify-tag";
export { ClockifyDialog } from "./components/clockify-dialog";

const debugInfo = {
  packageName: __PACKAGE_NAME__,
  version: __PACKAGE_VERSION__,
  commitHash: __COMMIT_HASH__,
};

if (typeof window !== "undefined") {
  // @ts-ignore
  window.CLOCKIFY_WEB_COMPONENTS_DEBUG_INFO = debugInfo;
}