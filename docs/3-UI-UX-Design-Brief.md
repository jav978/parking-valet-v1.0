# 3. UI/UX Design Brief
## Parking Valet System v1.0

---

## 1. Filosofía de Diseño y Estética Visual

El diseño de **Parking Valet System v1.0** está construido sobre los principios de **Modern Glassmorphism, Dark/Light Mode Adaptativo y Alta Legibilidad Operativa**.

Dado que el sistema es utilizado por operadores de parqueadero en entornos de alta velocidad (entradas de vehículos, cobro en taquilla), la interfaz prioriza:
- **Botones Táctiles de Gran Tamaño**: Mínimo 44px de altura con área de toque amplia.
- **Jerarquía Tipográfica Clara**: Fuentes sans-serif modernas (Inter / Roboto) con contrastes elevados.
- **Uso Semántico del Color**: Colores corporativos Teal/Emerald para acciones exitosas y estados de ingresos; Rojo/Naranja para advertencias, deudas y puestos ocupados.

---

## 2. Paleta de Colores del Sistema

```
+-----------------------------------------------------------------------+
|  PRIMARY BRAND COLOR: Teal / Esmeralda Corporativo                    |
|  Light: #0f766e (Teal 700)  |  Dark: #14b8a6 (Teal 500)               |
+-----------------------------------------------------------------------+
|  SURFACE COLORS (Light Mode):                                         |
|  Background: #f8fafc (Slate 50) | Cards: #ffffff | Border: #e2e8f0     |
|  SURFACE COLORS (Dark Mode):                                          |
|  Background: #0f172a (Slate 900) | Cards: #1e293b | Border: #334155     |
+-----------------------------------------------------------------------+
|  STATE COLORS:                                                        |
|  Success (Activo/Disponible): #10b981 (Green 500)                     |
|  Warning (Por Vencer/Solicitado): #f59e0b (Amber 500)                 |
|  Danger (Ocupado/Vencido/Bloqueado): #ef4444 (Red 500)                 |
|  Info (En Tránsito/Procesando): #3b82f6 (Blue 500)                    |
+-----------------------------------------------------------------------+
```

---

## 3. Disposición Estructural de Pantallas (Layout Architecture)

Todas las páginas internas protegidas comparten la estructura del componente `Layout`:

```
+-----------------------------------------------------------------------+
|  HEADER / TOPBAR                                                      |
|  [Logo] [Toggle Menu]   [Tasa BCV USD/VES]  [User Profile] [Logout]   |
+-------------------+---------------------------------------------------+
|  SIDEBAR MENU     |  MAIN CONTENT AREA                                |
|  - Dashboard      |                                                   |
|  - Tickets        |  +---------------------------------------------+  |
|  - Clientes       |  | Page Header (Title + Breadcrumbs + Actions) |  |
|  - Vehículos      |  +---------------------------------------------+  |
|  - Estacionamiento|  |                                             |  |
|  - Tarifas        |  | KPI Summary Cards                           |  |
|  - Caja & Pagos   |  |                                             |  |
|  - Reportes       |  +---------------------------------------------+  |
|  - Usuarios/Roles |  | Interactive Data Tables / Forms             |  |
|  - Configuración  |  |                                             |  |
|  - Licencia 🔑    |  +---------------------------------------------+  |
|  - Normativa 📖   |                                                   |
+-------------------+---------------------------------------------------+
```

---

## 4. Guía de Componentes UI Reutilizables

### A. Botones de Acción (Action Buttons)
- **Primario (`p-button-primary`)**: Fondo Teal/Esmeralda, texto blanco, sombra sutil. Utilizado en "Nuevo Ticket", "Guardar Cambios", "Activar Licencia".
- **Secundario / Contorno (`p-button-outlined`)**: Borde Slate, texto adaptable a tema. Usado en "Cancelar", "Filtros".
- **Exportación Especializada**:
  - `Exportar PDF`: Fondo rojo traslúcido (`bg-red-500/10`), borde rojo, icono `pi pi-file-pdf`.
  - `Exportar Excel (.xlsx)`: Fondo verde esmeralda (`bg-emerald-500/10`), borde verde, icono `pi pi-file-excel`.

### B. Tarjetas KPI (Summary Metrics)
- Esquinas redondeadas (`rounded-2xl`), borde fino (`border-surface-200/800`), sombra suave (`shadow-sm`).
- Icono destacado encerrado en contenedor circular con color de contraste.
- Valor numérico de tamaño 24px+ en fuente ennegrecida (`font-bold`).

### C. Tablas de Datos (`p-table`)
- Encabezado con fondo de superficie suave y texto en negrita.
- Filas con sombreado alternativo para mejorar el seguimiento visual.
- Paginación integrada con selector de registros por página (10, 20, 50).
- Búsqueda global por texto/placa/cliente en tiempo real.

---

## 5. Comportamiento Responsive y Multi-Dispositivo

1. **Pantallas Desktop (> 1024px)**:
   - Sidebar visible fija a la izquierda.
   - Tablas multicolumna completas con acciones a la derecha.
2. **Tablets & Laptops (768px - 1023px)**:
   - Sidebar colapsable mediante botón hamburguesa.
   - Grillas de KPI adaptadas a 2 columnas.
3. **Móviles (< 767px)**:
   - Sidebar flotante emergente.
   - Tablas con scroll horizontal o tarjetas verticales stackeadas.
   - Formulario de ticket adaptado a una sola columna vertical.
