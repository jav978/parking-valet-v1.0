"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    const permissionsData = [
        { code: 'auth.login', name: 'Iniciar sesión', module: 'auth' },
        { code: 'auth.logout', name: 'Cerrar sesión', module: 'auth' },
        { code: 'auth.profile', name: 'Ver perfil propio', module: 'auth' },
        { code: 'users.list', name: 'Listar usuarios', module: 'users' },
        { code: 'users.create', name: 'Crear usuarios', module: 'users' },
        { code: 'users.read', name: 'Ver detalle de usuario', module: 'users' },
        { code: 'users.update', name: 'Actualizar usuarios', module: 'users' },
        { code: 'users.delete', name: 'Eliminar usuarios', module: 'users' },
        { code: 'roles.list', name: 'Listar roles', module: 'roles' },
        { code: 'roles.create', name: 'Crear roles', module: 'roles' },
        { code: 'roles.read', name: 'Ver detalle de rol', module: 'roles' },
        { code: 'roles.update', name: 'Actualizar roles', module: 'roles' },
        { code: 'roles.delete', name: 'Eliminar roles', module: 'roles' },
        { code: 'roles.permissions', name: 'Asignar permisos a roles', module: 'roles' },
        { code: 'clients.list', name: 'Listar clientes', module: 'clients' },
        { code: 'clients.create', name: 'Crear clientes', module: 'clients' },
        { code: 'clients.read', name: 'Ver detalle de cliente', module: 'clients' },
        { code: 'clients.update', name: 'Actualizar clientes', module: 'clients' },
        { code: 'clients.delete', name: 'Eliminar clientes', module: 'clients' },
        { code: 'vehicles.list', name: 'Listar vehículos', module: 'vehicles' },
        { code: 'vehicles.create', name: 'Crear vehículos', module: 'vehicles' },
        { code: 'vehicles.read', name: 'Ver detalle de vehículo', module: 'vehicles' },
        { code: 'vehicles.update', name: 'Actualizar vehículos', module: 'vehicles' },
        { code: 'vehicles.delete', name: 'Eliminar vehículos', module: 'vehicles' },
        { code: 'parking-lots.list', name: 'Listar playas', module: 'parking-lots' },
        { code: 'parking-lots.create', name: 'Crear playas', module: 'parking-lots' },
        { code: 'parking-lots.read', name: 'Ver detalle de playa', module: 'parking-lots' },
        { code: 'parking-lots.update', name: 'Actualizar playas', module: 'parking-lots' },
        { code: 'parking-lots.delete', name: 'Eliminar playas', module: 'parking-lots' },
        { code: 'parking-spots.list', name: 'Listar lugares', module: 'parking-spots' },
        { code: 'parking-spots.create', name: 'Crear lugares', module: 'parking-spots' },
        { code: 'parking-spots.update', name: 'Actualizar lugares', module: 'parking-spots' },
        { code: 'parking-spots.delete', name: 'Eliminar lugares', module: 'parking-spots' },
        { code: 'rates.list', name: 'Listar tarifas', module: 'rates' },
        { code: 'rates.create', name: 'Crear tarifas', module: 'rates' },
        { code: 'rates.read', name: 'Ver detalle de tarifa', module: 'rates' },
        { code: 'rates.update', name: 'Actualizar tarifas', module: 'rates' },
        { code: 'rates.delete', name: 'Eliminar tarifas', module: 'rates' },
        { code: 'tickets.list', name: 'Listar tickets', module: 'tickets' },
        { code: 'tickets.create', name: 'Registrar entrada', module: 'tickets' },
        { code: 'tickets.read', name: 'Ver detalle de ticket', module: 'tickets' },
        { code: 'tickets.close', name: 'Registrar salida', module: 'tickets' },
        { code: 'tickets.cancel', name: 'Anular ticket', module: 'tickets' },
        { code: 'tickets.reprint', name: 'Reimprimir ticket', module: 'tickets' },
        { code: 'payments.list', name: 'Listar pagos', module: 'payments' },
        { code: 'payments.create', name: 'Registrar pago', module: 'payments' },
        { code: 'payments.read', name: 'Ver detalle de pago', module: 'payments' },
        { code: 'cash-registers.list', name: 'Listar cajas', module: 'cash-registers' },
        { code: 'cash-registers.open', name: 'Abrir caja', module: 'cash-registers' },
        { code: 'cash-registers.close', name: 'Cerrar caja', module: 'cash-registers' },
        { code: 'cash-registers.movements', name: 'Gestionar movimientos', module: 'cash-registers' },
        { code: 'subscriptions.list', name: 'Listar abonos', module: 'subscriptions' },
        { code: 'subscriptions.create', name: 'Crear abonos', module: 'subscriptions' },
        { code: 'subscriptions.update', name: 'Actualizar abonos', module: 'subscriptions' },
        { code: 'subscriptions.delete', name: 'Eliminar abonos', module: 'subscriptions' },
        { code: 'reservations.list', name: 'Listar reservas', module: 'reservations' },
        { code: 'reservations.create', name: 'Crear reservas', module: 'reservations' },
        { code: 'reservations.update', name: 'Actualizar reservas', module: 'reservations' },
        { code: 'reservations.cancel', name: 'Cancelar reservas', module: 'reservations' },
        { code: 'reports.revenue', name: 'Reporte de ingresos', module: 'reports' },
        { code: 'reports.vehicles', name: 'Reporte de vehículos', module: 'reports' },
        { code: 'reports.clients', name: 'Reporte de clientes', module: 'reports' },
        { code: 'reports.occupancy', name: 'Reporte de ocupación', module: 'reports' },
        { code: 'reports.export', name: 'Exportar reportes', module: 'reports' },
        { code: 'dashboard.view', name: 'Ver dashboard', module: 'dashboard' },
        { code: 'settings.list', name: 'Ver configuración', module: 'settings' },
        { code: 'settings.update', name: 'Actualizar configuración', module: 'settings' },
        { code: 'printers.list', name: 'Listar impresoras', module: 'printers' },
        { code: 'printers.create', name: 'Configurar impresora', module: 'printers' },
        { code: 'printers.update', name: 'Actualizar impresora', module: 'printers' },
        { code: 'printers.delete', name: 'Eliminar impresora', module: 'printers' },
        { code: 'audit-logs.list', name: 'Ver auditoría', module: 'audit-logs' },
        { code: 'backups.create', name: 'Crear backups', module: 'backups' },
        { code: 'backups.restore', name: 'Restaurar backups', module: 'backups' },
    ];
    console.log('  Creating permissions...');
    const permissions = await Promise.all(permissionsData.map((p) => prisma.permission.upsert({
        where: { code: p.code },
        create: p,
        update: { name: p.name, module: p.module },
    })));
    console.log(`  ✓ ${permissions.length} permissions created`);
    const permissionMap = new Map(permissions.map((p) => [p.code, p.id]));
    console.log('  Creating roles...');
    const adminRole = await prisma.role.upsert({
        where: { name: 'ADMIN' },
        create: {
            name: 'ADMIN',
            description: 'Administrador del sistema - acceso total',
            isSystem: true,
        },
        update: {},
    });
    const supervisorRole = await prisma.role.upsert({
        where: { name: 'SUPERVISOR' },
        create: {
            name: 'SUPERVISOR',
            description: 'Supervisor - puede gestionar operaciones y ver reportes',
            isSystem: true,
        },
        update: {},
    });
    const cashierRole = await prisma.role.upsert({
        where: { name: 'CASHIER' },
        create: {
            name: 'CASHIER',
            description: 'Cajero - gestiona caja y cobros',
            isSystem: true,
        },
        update: {},
    });
    const operatorRole = await prisma.role.upsert({
        where: { name: 'OPERATOR' },
        create: {
            name: 'OPERATOR',
            description: 'Operador - registro de entradas y salidas',
            isSystem: true,
        },
        update: {},
    });
    console.log('  ✓ 4 roles created');
    async function assignPermissions(roleId, codes) {
        const data = codes
            .filter((code) => permissionMap.has(code))
            .map((code) => ({
            roleId,
            permissionId: permissionMap.get(code),
        }));
        await prisma.rolePermission.createMany({ data, skipDuplicates: true });
    }
    console.log('  Assigning permissions...');
    await assignPermissions(adminRole.id, permissionsData.map((p) => p.code));
    await assignPermissions(supervisorRole.id, [
        'auth.login', 'auth.logout', 'auth.profile',
        'clients.list', 'clients.create', 'clients.read', 'clients.update',
        'vehicles.list', 'vehicles.create', 'vehicles.read', 'vehicles.update',
        'parking-lots.list', 'parking-lots.read',
        'parking-spots.list', 'parking-spots.read',
        'rates.list', 'rates.read',
        'tickets.list', 'tickets.create', 'tickets.read', 'tickets.close', 'tickets.cancel', 'tickets.reprint',
        'payments.list', 'payments.create', 'payments.read',
        'cash-registers.list', 'cash-registers.open', 'cash-registers.close', 'cash-registers.movements',
        'subscriptions.list', 'subscriptions.create', 'subscriptions.update',
        'reservations.list', 'reservations.create', 'reservations.update', 'reservations.cancel',
        'reports.revenue', 'reports.vehicles', 'reports.clients', 'reports.occupancy', 'reports.export',
        'dashboard.view',
        'settings.list',
        'audit-logs.list',
    ]);
    await assignPermissions(cashierRole.id, [
        'auth.login', 'auth.logout', 'auth.profile',
        'clients.list', 'clients.create', 'clients.read', 'clients.update',
        'vehicles.list', 'vehicles.create', 'vehicles.read', 'vehicles.update',
        'tickets.list', 'tickets.read', 'tickets.close', 'tickets.reprint',
        'payments.list', 'payments.create', 'payments.read',
        'cash-registers.list', 'cash-registers.open', 'cash-registers.close', 'cash-registers.movements',
        'dashboard.view',
    ]);
    await assignPermissions(operatorRole.id, [
        'auth.login', 'auth.logout', 'auth.profile',
        'clients.list', 'clients.read',
        'vehicles.list', 'vehicles.read',
        'parking-spots.list',
        'tickets.list', 'tickets.create', 'tickets.read', 'tickets.close', 'tickets.reprint',
        'payments.create',
        'dashboard.view',
    ]);
    console.log('  ✓ Permissions assigned to roles');
    console.log('  Creating admin user...');
    const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@parking.com' },
        create: {
            email: 'admin@parking.com',
            passwordHash: adminPasswordHash,
            firstName: 'Admin',
            lastName: 'Sistema',
            phone: '+1234567890',
            isActive: true,
            roleId: adminRole.id,
        },
        update: {
            passwordHash: adminPasswordHash,
            roleId: adminRole.id,
        },
    });
    const operatorPasswordHash = await bcrypt.hash('Operator123!', 10);
    const operatorUser = await prisma.user.upsert({
        where: { email: 'operator@parking.com' },
        create: {
            email: 'operator@parking.com',
            passwordHash: operatorPasswordHash,
            firstName: 'Carlos',
            lastName: 'Operador',
            phone: '+1234567891',
            isActive: true,
            roleId: operatorRole.id,
            createdById: adminUser.id,
        },
        update: {},
    });
    const cashierUser = await prisma.user.upsert({
        where: { email: 'cashier@parking.com' },
        create: {
            email: 'cashier@parking.com',
            passwordHash: operatorPasswordHash,
            firstName: 'María',
            lastName: 'Cajera',
            phone: '+1234567892',
            isActive: true,
            roleId: cashierRole.id,
            createdById: adminUser.id,
        },
        update: {},
    });
    const supervisorUser = await prisma.user.upsert({
        where: { email: 'supervisor@parking.com' },
        create: {
            email: 'supervisor@parking.com',
            passwordHash: operatorPasswordHash,
            firstName: 'Ana',
            lastName: 'Supervisora',
            phone: '+1234567893',
            isActive: true,
            roleId: supervisorRole.id,
            createdById: adminUser.id,
        },
        update: {},
    });
    console.log('  ✓ 4 users created');
    console.log('    admin@parking.com / Admin123!');
    console.log('    operator@parking.com / Operator123!');
    console.log('    cashier@parking.com / Operator123!');
    console.log('    supervisor@parking.com / Operator123!');
    console.log('  Creating spot types...');
    const spotTypes = [
        { code: 'STANDARD', name: 'Estándar', description: 'Lugar de estacionamiento estándar' },
        { code: 'HANDICAP', name: 'Discapacitados', description: 'Lugar reservado para personas con discapacidad' },
        { code: 'EV', name: 'Carga Eléctrica', description: 'Lugar con cargador para vehículos eléctricos' },
        { code: 'MOTORCYCLE', name: 'Moto', description: 'Lugar para motocicletas' },
        { code: 'VIP', name: 'VIP', description: 'Lugar premium para clientes VIP' },
        { code: 'TRUCK', name: 'Camión', description: 'Lugar para camiones y vehículos grandes' },
    ];
    const createdSpotTypes = await Promise.all(spotTypes.map((st) => prisma.spotType.upsert({
        where: { code: st.code },
        create: st,
        update: { name: st.name },
    })));
    console.log(`  ✓ ${createdSpotTypes.length} spot types created`);
    const spotTypeMap = new Map(createdSpotTypes.map((st) => [st.code, st.id]));
    console.log('  Creating parking lot...');
    const parkingLot = await prisma.parkingLot.upsert({
        where: { code: 'MAIN-001' },
        create: {
            name: 'Estacionamiento Principal',
            code: 'MAIN-001',
            address: 'Av. Principal 123',
            city: 'Ciudad Central',
            state: 'Estado',
            country: 'País',
            phone: '+1234567890',
            email: 'contacto@parkingpro.com',
            totalSpots: 20,
            availableSpots: 20,
            openingTime: '06:00',
            closingTime: '23:00',
            is24h: false,
            isActive: true,
            hasEvCharging: true,
            hasSecurity: true,
            hasCovered: true,
            taxPercentage: 16,
            currency: 'MXN',
            ticketPrefix: 'TKT',
            ticketNextNum: 1,
            notes: 'Estacionamiento principal del sistema',
        },
        update: {},
    });
    console.log('  ✓ Parking lot created');
    console.log('  Creating parking spots...');
    const standardTypeId = spotTypeMap.get('STANDARD');
    const handicapTypeId = spotTypeMap.get('HANDICAP');
    const evTypeId = spotTypeMap.get('EV');
    const motorcycleTypeId = spotTypeMap.get('MOTORCYCLE');
    const vipTypeId = spotTypeMap.get('VIP');
    const spotsData = [];
    const floors = [1, 2];
    const sections = ['A', 'B'];
    for (const floor of floors) {
        for (const section of sections) {
            for (let num = 1; num <= 5; num++) {
                const spotNumber = `${section}${String(num).padStart(2, '0')}`;
                let spotTypeId = standardTypeId;
                const status = client_1.SpotStatus.AVAILABLE;
                if (section === 'A' && num === 1)
                    spotTypeId = handicapTypeId;
                else if (section === 'A' && num === 5)
                    spotTypeId = evTypeId;
                else if (section === 'B' && num === 1)
                    spotTypeId = vipTypeId;
                spotsData.push({
                    lotId: parkingLot.id,
                    spotNumber: `${floor}${spotNumber}`,
                    floor,
                    section,
                    spotTypeId,
                    status,
                    isActive: true,
                });
            }
        }
    }
    spotsData.push({
        lotId: parkingLot.id,
        spotNumber: 'M01',
        floor: 1,
        section: 'M',
        spotTypeId: motorcycleTypeId,
        status: client_1.SpotStatus.AVAILABLE,
        isActive: true,
    });
    spotsData.push({
        lotId: parkingLot.id,
        spotNumber: 'M02',
        floor: 1,
        section: 'M',
        spotTypeId: motorcycleTypeId,
        status: client_1.SpotStatus.AVAILABLE,
        isActive: true,
    });
    await Promise.all(spotsData.map((s) => prisma.parkingSpot.upsert({
        where: { lotId_spotNumber: { lotId: s.lotId, spotNumber: s.spotNumber } },
        create: s,
        update: { status: s.status, spotTypeId: s.spotTypeId },
    })));
    console.log(`  ✓ ${spotsData.length} parking spots created`);
    console.log('  Creating rates...');
    const ratesData = [
        {
            lotId: parkingLot.id,
            spotTypeId: standardTypeId,
            name: 'Por Hora - Estándar',
            rateType: client_1.RateType.HOURLY,
            baseAmount: 30,
            dailyMax: 200,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: standardTypeId,
            name: 'Por Fracción - Estándar',
            rateType: client_1.RateType.FRACTIONAL,
            baseAmount: 30,
            fractionalMinutes: 15,
            fractionalRate: 10,
            dailyMax: 200,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: standardTypeId,
            name: 'Tarifa Nocturna - Estándar',
            rateType: client_1.RateType.NIGHTLY,
            baseAmount: 80,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: standardTypeId,
            name: 'Mensual - Estándar',
            rateType: client_1.RateType.MONTHLY,
            baseAmount: 2500,
            monthlyRate: 2500,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: vipTypeId,
            name: 'Por Hora - VIP',
            rateType: client_1.RateType.HOURLY,
            baseAmount: 60,
            dailyMax: 400,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: evTypeId,
            name: 'Por Hora - EV',
            rateType: client_1.RateType.HOURLY,
            baseAmount: 40,
            dailyMax: 250,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: motorcycleTypeId,
            name: 'Por Hora - Moto',
            rateType: client_1.RateType.HOURLY,
            baseAmount: 15,
            dailyMax: 100,
        },
        {
            lotId: parkingLot.id,
            spotTypeId: handicapTypeId,
            name: 'Por Hora - Discapacitados',
            rateType: client_1.RateType.HOURLY,
            baseAmount: 20,
            dailyMax: 150,
        },
    ];
    await Promise.all(ratesData.map((r) => prisma.rate.create({ data: r })));
    console.log(`  ✓ ${ratesData.length} rates created`);
    console.log('  Creating demo clients...');
    const client1 = await prisma.client.upsert({
        where: { documentType_documentNumber: { documentType: client_1.DocumentType.ID, documentNumber: 'CLI-001' } },
        create: {
            firstName: 'Juan',
            lastName: 'Pérez García',
            documentType: client_1.DocumentType.ID,
            documentNumber: 'CLI-001',
            email: 'juan.perez@email.com',
            phone: '+521234567890',
            address: 'Calle Principal 456',
            clientType: client_1.ClientType.FREQUENT,
            notes: 'Cliente frecuente',
            createdById: adminUser.id,
        },
        update: {},
    });
    const client2 = await prisma.client.upsert({
        where: { documentType_documentNumber: { documentType: client_1.DocumentType.ID, documentNumber: 'CLI-002' } },
        create: {
            firstName: 'María',
            lastName: 'García López',
            documentType: client_1.DocumentType.ID,
            documentNumber: 'CLI-002',
            email: 'maria.garcia@email.com',
            phone: '+521234567891',
            address: 'Av. Secundaria 789',
            clientType: client_1.ClientType.VIP,
            notes: 'Cliente VIP - Descuento especial',
            createdById: adminUser.id,
        },
        update: {},
    });
    const client3 = await prisma.client.upsert({
        where: { documentType_documentNumber: { documentType: client_1.DocumentType.ID, documentNumber: 'CLI-003' } },
        create: {
            firstName: 'Carlos',
            lastName: 'López Martínez',
            documentType: client_1.DocumentType.ID,
            documentNumber: 'CLI-003',
            email: 'carlos.lopez@email.com',
            phone: '+521234567892',
            address: 'Blvd. Comercial 321',
            clientType: client_1.ClientType.CORPORATE,
            notes: 'Cliente corporativo',
            createdById: adminUser.id,
        },
        update: {},
    });
    console.log('  ✓ 3 demo clients created');
    console.log('  Creating demo vehicles...');
    await prisma.vehicle.upsert({
        where: { plateNumber: 'ABC-123' },
        create: {
            clientId: client1.id,
            plateNumber: 'ABC-123',
            brand: 'Toyota',
            model: 'Corolla',
            year: 2024,
            color: 'Gris',
            vehicleType: client_1.VehicleType.CAR,
            isActive: true,
        },
        update: {},
    });
    await prisma.vehicle.upsert({
        where: { plateNumber: 'XYZ-789' },
        create: {
            clientId: client2.id,
            plateNumber: 'XYZ-789',
            brand: 'BMW',
            model: 'Serie 3',
            year: 2024,
            color: 'Negro',
            vehicleType: client_1.VehicleType.CAR,
            isActive: true,
        },
        update: {},
    });
    await prisma.vehicle.upsert({
        where: { plateNumber: 'DEF-456' },
        create: {
            clientId: client3.id,
            plateNumber: 'DEF-456',
            brand: 'Ford',
            model: 'Transit',
            year: 2023,
            color: 'Blanco',
            vehicleType: client_1.VehicleType.VAN,
            isActive: true,
        },
        update: {},
    });
    await prisma.vehicle.upsert({
        where: { plateNumber: 'MOTO-01' },
        create: {
            clientId: client1.id,
            plateNumber: 'MOTO-01',
            brand: 'Honda',
            model: 'CB190',
            year: 2024,
            color: 'Rojo',
            vehicleType: client_1.VehicleType.MOTORCYCLE,
            isActive: true,
        },
        update: {},
    });
    console.log('  ✓ 4 demo vehicles created');
    console.log('  Creating system settings...');
    const settingsData = [
        {
            key: 'company.name',
            value: { name: 'Parking Pro' },
            description: 'Nombre de la empresa',
        },
        {
            key: 'company.logo',
            value: { url: null },
            description: 'URL del logo de la empresa',
        },
        {
            key: 'company.address',
            value: { address: 'Av. Principal 123, Ciudad Central' },
            description: 'Dirección de la empresa',
        },
        {
            key: 'company.phone',
            value: { phone: '+1234567890' },
            description: 'Teléfono de la empresa',
        },
        {
            key: 'company.email',
            value: { email: 'contacto@parkingpro.com' },
            description: 'Correo de la empresa',
        },
        {
            key: 'company.currency',
            value: { code: 'MXN', symbol: '$', name: 'Peso Mexicano' },
            description: 'Moneda del sistema',
        },
        {
            key: 'company.tax_percentage',
            value: { percentage: 16 },
            description: 'Porcentaje de impuesto (IVA)',
        },
        {
            key: 'ticket.format',
            value: { width: '80mm', charset: 'cp437', headerAlign: 'center' },
            description: 'Formato de impresión de tickets',
        },
        {
            key: 'qr.enabled',
            value: { enabled: true },
            description: 'Habilitar generación de QR en tickets',
        },
        {
            key: 'backup.enabled',
            value: { enabled: true, frequency: 'daily', time: '03:00', retention: 30 },
            description: 'Configuración de backups automáticos',
        },
    ];
    await Promise.all(settingsData.map((s) => prisma.setting.upsert({
        where: { key: s.key },
        create: s,
        update: { value: s.value },
    })));
    console.log('  ✓ 10 system settings created');
    console.log('\n✅ Seed completed successfully!');
}
main()
    .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map