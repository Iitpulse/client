export function hasPatternPemissions(
  permissions: {
    isReadPermitted: boolean;
    isCreatePermitted: boolean;
    isUpdatePermitted: boolean;
  },
  patternId: any
): boolean {
  return (
    permissions.isReadPermitted &&
    permissions.isCreatePermitted &&
    (patternId ? permissions.isUpdatePermitted : true)
  );
}
