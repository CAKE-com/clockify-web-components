import { LitElement } from "lit";

function activateDarkMode(element:  HTMLElement | LitElement) {
    element.classList?.remove("sl-theme-light");
    element.classList?.add("sl-theme-dark");
}

function activateLightMode(element:  HTMLElement | LitElement) {
    element.classList?.remove("sl-theme-dark");
    element.classList?.add("sl-theme-light");
}

function findThemeDefiningParent(element: any) {
    while (element) {
        if (element.classList?.contains("dark") || element.dataset?.theme === "dark" || element.classList?.contains("light") || element.dataset?.theme === "light") {
            return element;
        }
        if (element.assignedSlot) {
            element = element.assignedSlot;
        } else if (element.parentNode) {
            element = element.parentNode;
        } else if (element.host) {
            element = element.host;
        } else {
            element = null;
        }
    }
    return null;
}

function toggleClasses(element: HTMLElement | LitElement, lightOrDarkParent: HTMLElement | LitElement | null) {
    if(lightOrDarkParent) {
        const theme: "dark" | "light" = lightOrDarkParent.classList?.contains("dark") || lightOrDarkParent.dataset?.theme === "dark" ? "dark" : "light";
        if (theme === "dark") {
            activateDarkMode(element);
            return;
        }
        if (theme === "light") {
            activateLightMode(element);
            return;
        }
    } else {
        const colorSchemeQueryDark = window.matchMedia('(prefers-color-scheme: dark)');
        if (colorSchemeQueryDark.matches) {
            activateDarkMode(element);
            return;
        }
        const colorSchemeQueryLight = window.matchMedia('(prefers-color-scheme: light)');
        if (colorSchemeQueryLight.matches) {
            activateLightMode(element);
            return;
        }
        activateLightMode(element);
    }
}

function listenForPreferredColorScheme(element: HTMLElement | LitElement, target: HTMLElement | LitElement) {
    const themeDefiningParent = findThemeDefiningParent(element);
    const darkColorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if(darkColorSchemeQuery.matches) {
        darkColorSchemeQuery.addEventListener("change", () => {
            toggleClasses(target, themeDefiningParent);
        });
    }
    const lightColorSchemeQuery = window.matchMedia('(prefers-color-scheme: light)');
    if(lightColorSchemeQuery.matches) {
        lightColorSchemeQuery.addEventListener("change", () => {
            toggleClasses(target, themeDefiningParent);
        });
    }
}

export function toggleTheme(
  element: HTMLElement | LitElement,
  targetElement?: HTMLElement | LitElement | null
) {
  const themeDefiningParent = findThemeDefiningParent(element);
  const target = targetElement || element;
  if (element) {
    const config = { attributes: true,  childList: false,  subtree: false };
    toggleClasses(target, themeDefiningParent);
    listenForPreferredColorScheme(element, target);
    const callback = (
      mutationList: MutationRecord[],
      observer: MutationObserver,
    ) => {
      observer.disconnect();
      for (const mutation of mutationList) {
        if (
          mutation.type === "attributes" &&
            (mutation.attributeName === "class" ||
                mutation.attributeName === "data-theme")
        ) {
          const targetMutation = mutation.target as HTMLElement;
          toggleClasses(target, targetMutation);
        }
      }
      if(themeDefiningParent) {
        observer.observe(themeDefiningParent, config);
      }
    };
    const observer = new MutationObserver(callback);
    if(themeDefiningParent) {
      observer.observe(themeDefiningParent, config);
    }
  }
}
