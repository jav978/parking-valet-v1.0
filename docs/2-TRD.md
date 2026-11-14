# 2. Technical Requirement Document (TRD)
## Parking Valet System v1.0

---

## 1. Arquitectura del Sistema

El sistema sigue una arquitectura desacoplada **Frontend SPA + Backend REST API + Multiplataforma Electron**:

```
+-----------------------------------------------------------------------+
|                           CLIENT LAYER                                |
|                                                                       |
|  +---------------------------------+   +---------------------------+  |
|  |     Angular 22 SPA (Web)        |   |   Electron App (Desktop)  |  |
|  |   PrimeNG 22 + Tailwind CSS 4   |   |   Node Main + Native POS  |  |
|  +---------------------------------+   +---------------------------+  |
+-----------------------------------||----------------------------------+
                                    ||  HTTP / REST API (JSON)
+-----------------------------------vv----------------------------------+
|                           BACKEND LAYER                               |
|                                                                       |
|                     NestJS Framework (Node.js)                        |
|   +-------------------+  +-------------------+  +-----------------+   |
|   |  Auth & Guards    |  |  Business Logic   |  | License Guard   |   |
|   | (JWT + Passport)  |  | (Tickets/Caja/BCV)|  | (Clock-Tamper)  |   |
|   +-------------------+  +-------------------+  +-----------------+   |
+-----------------------------------||----------------------------------+
                                    ||  Prisma ORM v6
+-----------------------------------vv----------------------------------+
|                           DATA LAYER                                  |
|                                                                       |
|                   PostgreSQL Relational Database                      |
|      Tables: users, roles, tickets, payments, cash_registers,         |
|              license_keys, settings, vehicles, clients, etc.          |
+-----------------------------------------------------------------------+
```

---

## 2. Stack Tecnológico Elegido

### Frontend Stack
- **Framework Core**: Angular v22.0 (Standalone Components, RxJS signals, Functional Guards).
- **UI & Component Library**: PrimeNG v22.0-rc.1 (Tables, Dialogs, Toasts, Pickers).
- **CSS System**: Tailwind CSS v4.3 + Tailwind PrimeUI.
- **Iconography**: PrimeIcons v7.0.
- **PDF Generation**: `jspdf` v2.5 + `jspdf-autotable` v5.0 (Vector PDF generation with custom headers/footers).
- **Excel Export**: `xlsx` (SheetJS v0.20).
- **Barcode & QR Generation**: `qrcode` v1.5.

### Backend Stack
- **Framework Core**: NestJS v11.0 (TypeScript, Modular Architecture).
- **Database ORM**: Prisma ORM v6.19 (PostgreSQL Connector).
- **Authentication & Security**: Passport.js, JWT (`@nestjs/jwt`), Bcrypt v5.1, Helmet v8.0, Throttler rate-limiting.
- **Validation**: `class-validator`, `class-transformer`.

### Desktop Packaging
- **Runtime**: Electron v43.0 + `electron-builder` v26.15.
- **Cross-Platform Target**: AppImage/deb (Linux), NSIS installer (Windows), DMG (macOS).

---

## 3. Estrategia de Autenticación y Seguridad

### A. Gestión de Tokens JWT
- Autenticación stateless basada en pares `accessToken` (expiración corta) y `refreshToken`.
- **Almacenamiento Seguro**: El cliente web utiliza `sessionStorage` para guardar los tokens. Al cerrar la pestaña o el navegador, la sesión es destruida automáticamente.
- **Guardia de Expiración**: Al cargar el cliente (`getStoredUser`), se decodifica la fecha de expiración del JWT (`exp`). Si ha vencido, borra los tokens y redirige a `/auth/login`.

### B. Guardia de Licenciamiento y Reloj (`subscriptionGuard`)
- Cada petición protegida evalúa el estado del licenciamiento provisto por `LicenseService`.
- **Protección Anti-Clock Tampering**: El backend registra marcas de tiempo del servidor. Si se detecta un retroceso en el reloj del sistema operativo local o expiración de los 30 días de la clave activa, la cuenta se bloquea (`status: 'TAMPER_LOCKED'` o `'EXPIRED'`) y fuerza la navegación a la pantalla `/licencia-vencida`.

---

## 4. API Endpoints Principales

| Módulo | Método | Endpoint | Descripción |
|---|---|---|---|
| **Auth** | `POST` | `/api/auth/login` | Autentica usuario y retorna tokens JWT + permisos. |
| **Auth** | `POST` | `/api/auth/refresh` | Renueva el token de acceso. |
| **Tickets** | `POST` | `/api/tickets` | Emite nuevo ticket con código QR. |
| **Tickets** | `PATCH` | `/api/tickets/:id/status` | Actualiza estatus de vehículo (Parked, Requested, Delivered). |
| **Caja** | `POST` | `/api/cash-registers/open` | Abre caja registradora con monto inicial. |
| **Caja** | `POST` | `/api/cash-registers/close` | Cierra caja registradora con arqueo final. |
| **Pagos** | `POST` | `/api/payments` | Registra cobro multimoneda (USD/VES) de un ticket. |
| **Reportes** | `GET` | `/api/reports/revenue` | Obtiene consolidados financieros por periodo. |
| **Reportes** | `GET` | `/api/reports/export` | Exporta datos planos en formato CSV. |
| **Licencia** | `GET` | `/api/license/status` | Consulta estado activo, días restantes y banderas de seguridad. |
| **Licencia** | `POST` | `/api/license/activate` | Valida y canjea clave de activación de 30 días (`VALET-XXXX-YYYY-ZZZZ`). |

---

## 5. Requerimientos de Infraestructura y Entorno

- **Node.js**: v20.x o v22.x LTS.
- **Base de Datos**: PostgreSQL v14+ (Puerto por defecto: 5432).
- **Variables de Entorno (.env)**:
  ```env
  DATABASE_URL="postgresql://user:pass@localhost:5432/parking_db?schema=public"
  JWT_SECRET="super-secret-key-valet-2026"
  JWT_EXPIRES_IN="8h"
  PORT=3000
  ```
