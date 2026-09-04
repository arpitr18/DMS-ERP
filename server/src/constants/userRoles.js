export const UserRole = Object.freeze({
  DISTRIBUTOR: "DISTRIBUTOR",
  SALESMAN: "SALESMAN",
});

// ADMIN is accepted temporarily so sessions issued before the role migration
// continue working until their token expires or the user signs in again.
export const distributorRoles = [UserRole.DISTRIBUTOR, "ADMIN"];
