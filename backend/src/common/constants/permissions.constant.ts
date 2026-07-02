export const PERMISSIONS = {
  // Auth
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_PROFILE: 'auth.profile',

  // Users
  USERS_LIST: 'users.list',
  USERS_CREATE: 'users.create',
  USERS_READ: 'users.read',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  // Roles
  ROLES_LIST: 'roles.list',
  ROLES_CREATE: 'roles.create',
  ROLES_READ: 'roles.read',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_PERMISSIONS: 'roles.permissions',

  // Clients
  CLIENTS_LIST: 'clients.list',
  CLIENTS_CREATE: 'clients.create',
  CLIENTS_READ: 'clients.read',
  CLIENTS_UPDATE: 'clients.update',
  CLIENTS_DELETE: 'clients.delete',

  // Vehicles
  VEHICLES_LIST: 'vehicles.list',
  VEHICLES_CREATE: 'vehicles.create',
  VEHICLES_READ: 'vehicles.read',
  VEHICLES_UPDATE: 'vehicles.update',
  VEHICLES_DELETE: 'vehicles.delete',

  // Parking Lots
  PARKING_LOTS_LIST: 'parking-lots.list',
  PARKING_LOTS_CREATE: 'parking-lots.create',
  PARKING_LOTS_READ: 'parking-lots.read',
  PARKING_LOTS_UPDATE: 'parking-lots.update',
  PARKING_LOTS_DELETE: 'parking-lots.delete',

  // Parking Spots
  PARKING_SPOTS_LIST: 'parking-spots.list',
  PARKING_SPOTS_CREATE: 'parking-spots.create',
  PARKING_SPOTS_UPDATE: 'parking-spots.update',
  PARKING_SPOTS_DELETE: 'parking-spots.delete',

  // Rates
  RATES_LIST: 'rates.list',
  RATES_CREATE: 'rates.create',
  RATES_READ: 'rates.read',
  RATES_UPDATE: 'rates.update',
  RATES_DELETE: 'rates.delete',

  // Tickets
  TICKETS_LIST: 'tickets.list',
  TICKETS_CREATE: 'tickets.create',
  TICKETS_READ: 'tickets.read',
  TICKETS_CLOSE: 'tickets.close',
  TICKETS_CANCEL: 'tickets.cancel',
  TICKETS_REPRINT: 'tickets.reprint',

  // Payments
  PAYMENTS_LIST: 'payments.list',
  PAYMENTS_CREATE: 'payments.create',
  PAYMENTS_READ: 'payments.read',

  // Cash Registers
  CASH_REGISTERS_LIST: 'cash-registers.list',
  CASH_REGISTERS_OPEN: 'cash-registers.open',
  CASH_REGISTERS_CLOSE: 'cash-registers.close',
  CASH_REGISTERS_MOVEMENTS: 'cash-registers.movements',

  // Subscriptions
  SUBSCRIPTIONS_LIST: 'subscriptions.list',
  SUBSCRIPTIONS_CREATE: 'subscriptions.create',
  SUBSCRIPTIONS_UPDATE: 'subscriptions.update',
  SUBSCRIPTIONS_DELETE: 'subscriptions.delete',

  // Reservations
  RESERVATIONS_LIST: 'reservations.list',
  RESERVATIONS_CREATE: 'reservations.create',
  RESERVATIONS_UPDATE: 'reservations.update',
  RESERVATIONS_CANCEL: 'reservations.cancel',

  // Reports
  REPORTS_REVENUE: 'reports.revenue',
  REPORTS_VEHICLES: 'reports.vehicles',
  REPORTS_CLIENTS: 'reports.clients',
  REPORTS_OCCUPANCY: 'reports.occupancy',
  REPORTS_EXPORT: 'reports.export',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',

  // Settings
  SETTINGS_LIST: 'settings.list',
  SETTINGS_UPDATE: 'settings.update',

  // Printers
  PRINTERS_LIST: 'printers.list',
  PRINTERS_CREATE: 'printers.create',
  PRINTERS_UPDATE: 'printers.update',
  PRINTERS_DELETE: 'printers.delete',

  // Audit
  AUDIT_LOGS_LIST: 'audit-logs.list',

  // Backups
  BACKUPS_CREATE: 'backups.create',
  BACKUPS_RESTORE: 'backups.restore',
} as const;
