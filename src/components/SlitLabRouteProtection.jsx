import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

export default function SlitLabRouteProtection({ children }) {
  const { user } = useSelector((state) => state.auth);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const normalize = (value) => (typeof value === 'string' ? value.toLowerCase() : undefined);

  const normalizedRole = normalize(user.role);
  const normalizedUserType = normalize(user.userType);

  const slitLabRoles = new Set([
    'slitlab',
    'slit lab',
    'slit lab staff',
    'slit lab technician',
  ]);

  const slitLabUserTypes = new Set([
    'slitlab',
    'slitlabstaff',
  ]);

  const roleHasAccess = Boolean(
    (normalizedRole && slitLabRoles.has(normalizedRole)) ||
      (normalizedRole && normalizedRole.includes('slit'))
  );

  const userTypeHasAccess = Boolean(
    (normalizedUserType && slitLabUserTypes.has(normalizedUserType)) ||
      (normalizedUserType && normalizedUserType.includes('slit'))
  );

  const arrayRolesHasAccess = Array.isArray(user.roles)
    ? user.roles.some((role) => normalize(role)?.includes('slit'))
    : false;

  const hasPermissionFlag = Array.isArray(user.permissions)
    ? user.permissions.some((permission) => normalize(permission) === 'slit_lab_access')
    : typeof user.permissions === 'string'
      ? normalize(user.permissions) === 'slit_lab_access'
      : Boolean(user.slitLabAccess || user.isSlitLabStaff);

  if (roleHasAccess || userTypeHasAccess || arrayRolesHasAccess || hasPermissionFlag) {
    return children;
  }

  return <Navigate to="/login" replace />;
}

