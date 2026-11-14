# 4. App Flow & User Navigation
## Parking Valet System v1.0

---

## 1. Mapa de Navegación General

```mermaid
graph TD
    Start([Usuario abre la App]) --> CheckAuth{¿Sesión activa en sessionStorage?}
    
    CheckAuth -- No --> LoginScreen[/auth/login/]
    LoginScreen -->|Ingresa credenciales válidas| CheckLicense{¿Licencia activa y reloj OK?}
    
    CheckAuth -- Sí --> CheckLicense
    
    CheckLicense -- Expirada / Alterado --> LockoutScreen[/licencia-vencida/]
    LockoutScreen -->|Ingresa clave VALET-XXXX-YYYY-ZZZZ| CheckLicense
    
    CheckLicense -- Válida --> MainLayout[Layout Principal - Sidebar & Topbar]
    
    MainLayout --> Dashboard[/dashboard/]
    MainLayout --> Tickets[/tickets/]
    MainLayout --> Clientes[/clientes/]
    MainLayout --> Vehiculos[/vehiculos/]
    MainLayout --> Estacionamiento[/estacionamiento/]
    MainLayout --> Tarifas[/tarifas/]
    MainLayout --> Caja[/caja/]
    MainLayout --> Pagos[/pagos/]
    MainLayout --> Reportes[/reportes/]
    MainLayout --> Usuarios[/usuarios/]
    MainLayout --> Roles[/roles/]
    MainLayout --> Configuracion[/configuracion/]
    MainLayout --> Normativa[/normativa/]
```

---

## 2. Diagrama de Flujo Operativo: Registro y Cobro de Ticket

```mermaid
sequenceDiagram
    autonumber
    actor Cliente
    actor Valet as Operador Valet
    actor Cajero
    participant App as Frontend (Angular)
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Note over Cliente, Valet: ENTRADA DEL VEHÍCULO
    Cliente->>Valet: Entrega vehículo en recepción
    Valet->>App: Abre diálogo "Nuevo Ticket", ingresa Placa, Tipo, Zona
    Valet->>App: Toma fotos de inspección previa (opcional)
    App->>API: POST /api/tickets
    API->>DB: Guarda ticket (status: ENTRY, qrCode, entryTime)
    API-->>App: Retorna Ticket Creado
    App->>Valet: Imprime Ticket Térmico POS con Código QR

    Note over Valet, DB: UBICACIÓN
    Valet->>App: Cambia estatus a PARKED y asigna Puesto (Ej: ZONA A - 12)

    Note over Cliente, Cajero: SALIDA Y COBRO
    Cliente->>Cajero: Presenta Ticket o Indica Placa para retiro
    Cajero->>App: Escanea QR o busca Placa en el módulo Caja/Pagos
    App->>API: GET /api/tickets/calculate-fee/:id
    API-->>App: Retorna tiempo transcurrido, tarifa aplicable y monto (USD/VES)
    Cajero->>App: Registra pago (Efectivo/Tarjeta/Pago Móvil)
    App->>API: POST /api/payments
    API->>DB: Actualiza ticket (status: PAID), crea registro de Payment
    App->>Valet: Notifica solicitud de entrega (status: REQUESTED -> DELIVERED)
    App->>Cajero: Imprime Comprobante de Pago Térmico
```

---

## 3. Matriz de Acciones por Botón y Ruteo

| Pantalla / Módulo | Elemento UI / Botón | Acción / Evento | Destino / Resultado |
|---|---|---|---|
| `/auth/login` | Botón "Iniciar Sesión" | Valida formulario, envía `POST /api/auth/login` | Guarda JWT en `sessionStorage` y navega a `/dashboard` |
| `/dashboard` | Tarjeta KPI "Tickets Activos" | Click en la tarjeta | Navega a `/tickets?filter=active` |
| `/tickets` | Botón "+ Nuevo Ticket" | Abre diálogo modal de creación | Genera QR e imprime en impresora POS |
| `/tickets` | Botón "Cambiar Estado" | Despliega opciones: Parked, Requested, Delivered | Actualiza estatus y emite notificación |
| `/caja` | Botón "Abrir Caja" | Captura monto inicial en USD y VES | Registra turno activo de caja |
| `/caja` | Botón "Cerrar Caja" | Muestra resumen de recaudación y descuadre | Genera reporte de cierre y bloquea la caja |
| `/reportes` | Botón "Exportar PDF" | Invoca `exportPdf()` en `ReportExportService` | Descarga PDF vectorial con membrete corporativo |
| `/reportes` | Botón "Exportar Excel" | Invoca `exportExcel()` en `ReportExportService` | Descarga libro `.xlsx` nativo de Microsoft Excel |
| `/configuracion` | Tab "Licencia & Suscripción" | Muestra días restantes y formulario de clave | Permite ingresar clave `VALET-XXXX-YYYY-ZZZZ` |
| `/licencia-vencida` | Botón "Activar Licencia" | Envía `POST /api/license/activate` | Si es válida, desbloquea el sistema y redirige |
| Topbar | Botón "Cerrar Sesión" | Invoca `authService.logout()` | Limpia `sessionStorage` y redirige a `/auth/login` |
