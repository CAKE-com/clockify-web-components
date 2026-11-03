// a function to replace template strings that look like this: { variable }, with variables
export function t(
  template: string,
  variables: Record<string, string | number>
): string {
  if(!template) return "";
  return template?.replace(
    /{(\s*(\w+)\s*)}/g,
    (match: string, _: string, innerKey: string) => {
      return variables.hasOwnProperty(innerKey)
        ? variables[innerKey]?.toString()
        : match;
    }
  ) ?? "";
}