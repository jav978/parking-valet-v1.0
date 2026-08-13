# 1. Product Requirement Document (PRD)
## Parking Valet System v1.0

---

## 1. Visión General del Producto

**Parking Valet System v1.0** es un sistema integral de gestión de estacionamientos y servicios de Valet Parking diseñado para digitalizar, controlar y optimizar la operación de parqueaderos comerciales, centros comerciales, hoteles, restaurantes y eventos corporativos.

El producto resuelve las ineficiencias de control manual (pérdida de ingresos, tickets duplicados, falta de control en caja, tiempo de espera excesivo) mediante una plataforma ágil, segura y multiplataforma que funciona tanto en **Web (Navegador)** como en **Escritorio (Electron App para Windows, macOS y Linux)**.

---

## 2. Objetivos Principales del Sistema

1. **Gestión Operativa de Tickets**:
   - Registro express de entradas de vehículos con generación de código QR/Barra e impresión en impresoras térmicas POS (58mm/80mm).
   - Captura fotográfica de estado de vehículos al ingreso (inspección de daños previos).
   - Control de estado del ticket: `ENTRY`, `PARKED`, `REQUESTED`, `IN_TRANSIT`, `DELIVERED`, `CANCELLED`.
2. **Caja y Control Financiero**:
   - Apertura y arqueo de caja por turno con desglose multimoneda (USD / VES) y tasa del Banco Central de Venezuela (BCV).
   - Cálculo automático de tarifas dinámicas (por hora, fracción, tarifa plana, nocturna, abono mensual).
   - Múltiples métodos de pago: Efectivo, Tarjeta Débito/Crédito, Transferencia, Pago Móvil, Suscripción.
3. **Analítica y Reportes Ejecutivos**:
   - Generación de reportes vectoriales en **PDF con membrete institucional** y exportación nativa a **Excel (.xlsx)** y **CSV**.
   - Indicadores KPI en tiempo real: ingresos diarios, tasa de ocupación, horas pico, rendimiento por cajero/operador.
4. **Seguridad y Control de Licenciamiento**:
   - Autenticación JWT con rotación de tokens y cierre automático al cerrar sesión/navegador (`sessionStorage`).
   - Control de acceso basado en roles y permisos granulares (RBAC).
   - Protección de software mediante **Claves de Licencia de 30 días (`VALET-XXXX-YYYY-ZZZZ`)** con detección anti-manipulación de reloj del sistema.

---

## 3. Perfiles de Usuario (User Personas)

### A. Operador / Valet Driver
- **Rol**: Registra entrada de vehículos, ubica puestos asignados, recibe solicitudes de retiro y entrega vehículos.
- **Necesidad**: Interfaz ultra rápida, botones grandes, compatible con pantallas táctiles, impresión rápida de ticket térmico.

### B. Cajero / Recepcionista de Caja
- **Rol**: Realiza el cobro de tickets, valida tiempo transcurrido, procesa pagos multimoneda y emite comprobantes.
- **Necesidad**: Cálculo transparente de tarifas, conversión automática USD/VES, registro de cierres de caja.

### C. Administrador de Estacionamiento / Gerente
- **Rol**: Configura tarifas, supervisa ocupación de puestos, gestiona usuarios y roles, aprueba cortesías/descuentos.
- **Necesidad**: Reportes detallados, auditoría de acciones, control de abonados y clientes VIP.

### D. Dueño del Sistema / Proveedor del Software
- **Rol**: Administra la suscripción del cliente y emite claves de activación mensual.
- **Necesidad**: Control estricto de licencias para prevenir uso no autorizado.

---

## 4. Requerimientos Funcionales por Módulo

| Módulo | Funcionalidades Clave |
|---|---|
| **Autenticación y Seguridad** | Login con credenciales encriptadas (Bcrypt), Guard de Rutas, expiración de token JWT, bloqueo automático al vencer la licencia. |
| **Tickets & Operación** | Generación de ticket QR, cálculo de permanencia, fotos de inspección de vehículo, estatus de entrega en tiempo real. |
| **Puestos & Estacionamiento** | Mapa visual interactivo de zonas y puestos libre/ocupado/mantenimiento, asignación rápida. |
| **Tarifas & Moneda** | Tarifas por tipo de vehículo, horas de gracia, porcentaje de IVA, integración con API de tasa BCV para conversión a VES. |
| **Caja & Cobros** | Apertura/cierre de caja por turno, registro de pagos parciales/totales, comprobantes impresos en POS. |
| **Clientes & Vehículos** | Base de datos de clientes frecuentes, abonados mensuales, historial de vehículos por placa. |
| **Reportes & Analítica** | Exportación PDF (membrete corporativo, KPIs, gráficos de barra) y Excel (.xlsx) para Ingresos, Vehículos, Clientes, Operadores y Ocupación. |
| **Configuración & Licencia** | Datos de empresa en tickets, configuración de impresoras (USB/IP), gestión de claves `VALET-XXXX-YYYY-ZZZZ` de 30 días. |

---

## 5. Criterios de Éxito y Rendimiento (KPIs del Producto)

- **Tiempo de Emisión de Ticket**: < 3 segundos desde la lectura de placa hasta la impresión física del ticket.
- **Tiempo de Cobro en Caja**: < 5 segundos para procesar el pago y calcular el cambio en VES/USD.
- **Disponibilidad Offline/Desktop**: Operación ininterrumpida mediante la App de Escritorio Electron instalada localmente.
- **Precisión Financiera**: 100% de coincidencia entre los cobros registrados y el arqueo de caja diario.
