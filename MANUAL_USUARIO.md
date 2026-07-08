# Manual de Usuario — Sistema SPC en Tiempo Real

## Indice

1. [Acceso al sistema](#1-acceso-al-sistema)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Manual del Inspector](#3-manual-del-inspector)
4. [Manual del Supervisor](#4-manual-del-supervisor)
5. [Manual del Administrador](#5-manual-del-administrador)
6. [Glosario SPC](#6-glosario-spc)

---

## 1. Acceso al sistema

### 1.1 Como iniciar sesion

1. Abre el navegador y ve a la URL del sistema.
2. Ingresa tu **correo electronico** y **contrasena**.
3. Haz clic en **Iniciar sesion**.
4. El sistema detecta tu rol automaticamente y te redirige a la pantalla correspondiente.

### 1.2 Que hacer si no puedes entrar

- Verifica que el correo y la contrasena sean correctos.
- Si olvidaste tu contrasena, contacta al administrador del sistema para que la restablezca.
- Si ves el mensaje "No tienes maquinas asignadas", es porque el administrador aun no te ha asignado maquinas. Contactalo para que lo haga.
- Si ves el mensaje "No tienes permiso para acceder a esta seccion", tu rol no tiene acceso a esa pagina. Usa solo las secciones habilitadas para tu rol.

---

## 2. Roles y permisos

El sistema tiene 4 roles. Cada uno accede a diferentes secciones:

| Funcionalidad | Inspector | Supervisor | Admin | Super Admin |
|---|:---:|:---:|:---:|:---:|
| Captura de inspeccion (`/captura`) | SI | NO | NO | NO |
| Dashboard SPC completo (`/spc`) | NO | SI | SI | SI |
| Alarmas activas (`/alarmas`) | NO | SI | SI | SI |
| Six Pack de calidad (`/spc/sixpack`) | NO | SI | SI | SI |
| Estadisticas (`/estadisticas`) | NO | SI | SI | SI |
| Recalcular limites de control | NO | NO | SI | SI |
| Registrar cambio de proceso | NO | NO | SI | SI |
| Configuracion SPC (`/configuracion`) | NO | NO | SI | SI |
| Gestion de turnos (`/configuracion/turnos`) | NO | NO | SI | SI |
| Gestion de usuarios (`/usuarios`) | NO | NO | NO | SI |
| Gestion de lineas y maquinas (`/lineas`) | NO | NO | SI | SI |

**Descripcion rapida de cada rol:**

- **Inspector:** Solo puede capturar inspecciones en las maquinas que le fueron asignadas y ver el grafico SPC de su maquina en tiempo real.
- **Supervisor:** Ve todos los dashboards, alarmas y reportes estadisticos, pero no modifica configuraciones.
- **Admin:** Todo lo anterior, mas configuracion SPC, gestion de lineas/maquinas y gestion de turnos.
- **Super Admin:** Todo lo anterior, mas la gestion de usuarios (crear, editar, eliminar).

---

## 3. Manual del Inspector

La pantalla principal del inspector es la pagina de **Captura de Inspeccion** (`/dashboard/captura`).

### 3.1 Formulario de captura

Al entrar, ves el formulario de inspeccion con los siguientes campos:

**Maquina** (obligatorio)
- Dropdown con las maquinas activas asignadas a ti por el administrador.
- La primera maquina de la lista se selecciona automaticamente.
- Si el dropdown dice "No tienes maquinas asignadas", contacta al administrador.

**Caracteristica** (aparece solo si la maquina tiene caracteristicas configuradas)
- Dropdown con las caracteristicas de medicion de la maquina (por ejemplo: "Diametro exterior (mm)").
- Selecciona la caracteristica que estas midiendo.

**Turno** (detectado automaticamente)
- El sistema detecta el turno activo segun la hora actual. No necesitas seleccionarlo manualmente.
- El turno detectado se asigna automaticamente a la inspeccion que envias.

**Codigo de pieza** (obligatorio)
- Ingresa el numero o codigo de la pieza que inspeccionaste (por ejemplo: "P-2024-001").

**Valor 1, Valor 2, Valor 3, Valor 4, Valor 5** (los 5 son obligatorios)
- Ingresa las 5 mediciones individuales tomadas de la misma pieza.
- El sistema calcula el promedio automaticamente (no necesitas calcularlo).
- Usa punto decimal, no coma (ejemplo: `10.35` no `10,35`).

**Observaciones** (opcional)
- Campo de texto libre para notas relevantes (por ejemplo: "Pieza con rebaba en borde").

Al terminar, haz clic en **Enviar inspeccion**.

- Si la inspeccion se envio correctamente, aparece un aviso verde: "Inspeccion enviada correctamente".
- Si el punto quedara fuera de control estadistico, aparece un aviso rojo con la regla Western Electric violada.
- Los campos se limpian automaticamente despues del envio (la maquina seleccionada se mantiene).

### 3.2 Grafico SPC en tiempo real

Debajo del formulario aparece el grafico SPC de la maquina seleccionada, con el badge **EN VIVO** que indica que se actualiza automaticamente cada vez que se captura una nueva inspeccion.

**Mensajes que puede mostrar el area del grafico:**

| Mensaje | Que significa |
|---|---|
| "Esta maquina no tiene configuracion SPC" | El administrador no ha configurado los limites de control aun. Contactalo. |
| "Se necesitan minimo 2 piezas para el grafico I-MR" | Solo tienes 1 inspeccion enviada. Enviar una mas para que aparezca el grafico. |
| "Se han capturado X de N piezas necesarias para el primer punto del grafico" | Para graficos X̄-R o X̄-S, se necesita completar el subgrupo (N piezas) antes de ver el primer punto. |

**Como leer el grafico cuando ya aparece:**

- **Linea roja punteada superior (UCL):** Limite de Control Superior. Si un punto sube por encima, el proceso esta fuera de control.
- **Linea azul (CL):** Linea Central (promedio esperado del proceso).
- **Linea roja punteada inferior (LCL):** Limite de Control Inferior. Si un punto baja por debajo, el proceso esta fuera de control.
- **Puntos azules:** Mediciones normales, dentro de control.
- **Puntos rojos:** Mediciones fuera de control (violacion de alguna regla Western Electric). Haz clic en ellos para ver el detalle.
- **Zonas de color de fondo:**
  - Verde claro (0-1sigma): Zona C, proceso muy estable.
  - Amarillo claro (1-2sigma): Zona B, atencion.
  - Naranja claro (2-3sigma): Zona A, riesgo alto.

**Indicadores Cp y Cpk** (aparecen solo si la maquina tiene USL y LSL configurados):
- **Cp**: Capacidad potencial del proceso.
- **Cpk**: Capacidad real (considera el centrado del proceso).
- Verde = proceso capaz (Cpk >= 1.33), naranja = marginal (1.00-1.33), rojo = no capaz (< 1.00).

**Modal de detalle de punto fuera de control:**
Al hacer clic en un punto rojo del grafico, se abre un modal con:
- Nombre del inspector
- Hora de la inspeccion
- Valor medido
- Regla Western Electric violada

---

## 4. Manual del Supervisor

El supervisor tiene acceso de solo lectura a los dashboards de analisis SPC.

### 4.1 Dashboard SPC completo (`/dashboard/spc`)

Vista principal de analisis estadistico para todas las maquinas.

**Filtros disponibles (panel superior):**

| Filtro | Descripcion |
|---|---|
| Linea de Produccion | Filtra maquinas por linea. Seleccionar una linea limpia la maquina seleccionada. |
| Maquina | Lista de maquinas activas. Si seleccionaste linea, solo muestra las de esa linea. |
| Turno | Aparece cuando seleccionas maquina. Filtra las inspecciones por turno. "Todos los turnos" muestra todo. |
| Caracteristica | Aparece cuando la maquina tiene caracteristicas configuradas. Filtra por dimension medida. |

**Pills informativos** (aparecen al seleccionar maquina con config):
- **Tipo configurado:** Muestra si la maquina usa X̄-R, X̄-S o I-MR.
- **Subgrupo n=:** Tamano del subgrupo configurado.
- **EN VIVO - N puntos:** Indicador en tiempo real con el total de puntos cargados.

**Boton "Ver Six Pack"** (esquina superior derecha): Abre el analisis estadistico completo de 6 graficas.

**Panel de Capacidad del Proceso** (debajo del filtro):
- Semaforo verde/amarillo/rojo segun el Cpk.
- Muestra Cp y Cpk con 3 decimales.
- Leyenda: Verde = Capaz (>= 1.33), Naranja = Marginal (1.00-1.33), Rojo = No Capaz (< 1.00).
- Si no hay especificaciones USL/LSL, muestra "Sin datos de capacidad".

**Pestanas de analisis:**

| Pestana | Contenido |
|---|---|
| X̄-R | Grafico de medias y rangos. Limites UCL/CL/LCL con 4 decimales. Sigma estimada. |
| X̄-S | Grafico de medias y desviacion estandar. Misma estructura que X̄-R. |
| I-MR | Grafico de individuales y rango movil. |
| Fuera de Control (N) | Tabla combinada de los 3 tipos: Punto #, Hora, Valor, Tipo Grafico, Regla Violada. |
| Historial | Tabla de recalculos SPC: muestra los valores anteriores y nuevos de UCL, CL, LCL, Cp, Cpk. |
| Comparativa | Tarjetas con Cp/Cpk de todas las maquinas de la linea seleccionada, con semaforo de color. |

**En los graficos X̄-R, X̄-S, I-MR:**
- Pasa el mouse sobre los puntos para ver los valores exactos (tooltip).
- Los puntos rojos estan fuera de control. Haz clic para ver el detalle de la inspeccion.
- La barra de resumen muestra UCL, CL, LCL y sigma estimada.

**Boton "Exportar CSV"** (aparece en las pestanas de grafico cuando hay datos):
- Descarga un archivo CSV con: Indice, Valor, UCL, CL, LCL, Fecha, Inspector, Regla violada.

### 4.2 Alarmas Activas (`/dashboard/alarmas`)

Muestra todas las piezas que triggerearon un punto fuera de control (reglas Western Electric).

**Filtros:**
- **Todas las lineas / [Nombre de linea]:** Filtra alarmas por linea de produccion.
- **Todas / Sin acusar / Acusadas:** Filtra por estado de la alarma.
- Badge rojo "N sin acusar" cuando hay alarmas pendientes.

**Tarjetas de alarma — cada tarjeta muestra:**
- Nombre de la linea y de la maquina.
- Badge de estado: "Fuera de control" (rojo) o "Acusado" (verde, con quien la acuso y cuando).
- Regla WE violada (texto de la regla).
- Valor medido de la pieza.
- Nombre del inspector y hora de la inspeccion.

**Botones en cada tarjeta:**
- **Ver SPC:** Navega directamente al Dashboard SPC con esa maquina ya seleccionada.
- **Acknowledger:** Marca la alarma como vista. El boton desaparece y el badge cambia a "Acusado". Solo aparece en alarmas que aun no han sido acusadas.

### 4.3 Six Pack de Calidad (`/dashboard/spc/sixpack`)

Analisis estadistico completo de una maquina con 6 graficas simultaneas.

**Filtros disponibles:**
- **Linea, Maquina:** Igual que el Dashboard SPC.
- **Turno:** Filtra por turno (aparece si hay turnos configurados).
- **Caracteristica:** Filtra por dimension (aparece si la maquina tiene caracteristicas).
- **Rango de tiempo:** 24h | 7d | 30d | Custom.
  - En modo Custom aparecen dos campos de fecha: **Desde** y **Hasta** (con hora).

**Botones de exportacion:**
- **Registrar cambio:** Abre el modal para documentar un cambio de proceso (solo admin).
- **Exportar CSV:** Descarga los datos del grafico de control en CSV.
- **Exportar PDF:** Genera un PDF A3 horizontal con las 6 graficas.

**Las 6 graficas (grid 3x2):**

| # | Titulo | Que muestra |
|---|---|---|
| 1 | Carta de control | Grafico SPC (X̄-R, X̄-S o I-MR segun config de la maquina). |
| 2 | Histograma de distribucion | Distribucion de frecuencias de los valores medidos, con lineas USL y LSL. |
| 3 | Probabilidad normal | Verifica si los datos siguen una distribucion normal (grafica de probabilidad). |
| 4 | Analisis de capacidad | Indices Cp, Cpk, Pp, Ppk y estadisticas del proceso. |
| 5 | Ultimas 25 observaciones | Las ultimas 25 mediciones con lineas USL, LSL y media. |
| 6 | Diagrama de caja y bigotes | Box plot: minimo, Q1, mediana, Q3, maximo, con USL y LSL. |

### 4.4 Estadisticas (`/dashboard/estadisticas`)

Vista de resumen de produccion con graficas de inspeccion.

**Filtros disponibles:**
- Linea, Maquina, Turno.
- Selector de fecha (NeuDatePicker).

**Contenido:**
- Tarjetas de KPIs: totales de inspecciones y otros contadores.
- Grafica de dona (distribucion por categoria).
- Grafica de barras por hora del dia (distribucion horaria de inspecciones).
- Boton **Exportar CSV** para descargar los datos filtrados.

---

## 5. Manual del Administrador

El administrador tiene todo lo del supervisor mas la capacidad de configurar el sistema.

### 5.1 Botones exclusivos del Admin en el Dashboard SPC

Cuando seleccionas una maquina en `/dashboard/spc`, aparecen dos botones adicionales:

**Boton "Recalcular":**
- Recalcula los limites de control (UCL, CL, LCL) y los indices de capacidad (Cp, Cpk) usando los datos de piezas actuales.
- Se abre un modal de confirmacion antes de aplicar el recalculo.
- El sistema guarda el historial del recalculo (visible en la pestana "Historial").

**Boton "Registrar cambio":**
- Abre el modal para documentar un cambio de proceso en la maquina seleccionada.
- El cambio queda registrado y se visualiza como una linea vertical en el grafico de control.

### 5.2 Configuracion SPC (`/dashboard/configuracion`)

Gestion de la configuracion estadistica de cada maquina.

**Vista principal — tabla de maquinas:**
- Muestra todas las maquinas del sistema con su estado: **Configurada** (verde) o **Sin configurar** (rojo).
- **Buscador:** Filtra maquinas por nombre.
- **Filtro estado:** Todas / Configuradas / Sin configurar.
- **Orden:** Haz clic en cualquier columna para ordenar (Linea, Maquina, Estado, Tipo grafico, Subgrupo, Cp, Cpk, Actualizado).

**Columnas de la tabla:**
Linea, Maquina, Estado, Tipo Grafico, Subgrupo (n), UCL, CL, LCL, USL, LSL, Cp, Cpk, Actualizado.

**Botones por fila:**
- **Configurar / Editar:** Abre el modal de configuracion SPC.
- **Caracteristicas:** Expande/colapsa la seccion de caracteristicas de medicion de la maquina.
- **Eliminar** (solo si esta configurada): Elimina la configuracion SPC de la maquina.

**Modal Configurar / Editar — campos:**

| Campo | Descripcion |
|---|---|
| Maquina | (Solo en modo Crear) Dropdown con maquinas sin configuracion SPC aun. |
| Tipo de grafico | I-MR (individuales, 1 pieza a la vez) / X̄-R (subgrupos 2-10 piezas) / X̄-S (subgrupos >10 piezas). |
| Tamano de subgrupo | Numero de piezas por subgrupo. Para I-MR se usa siempre 1. |
| USL | Limite de Especificacion Superior (opcional). Necesario para calcular Cp y Cpk. |
| LSL | Limite de Especificacion Inferior (opcional). Necesario para calcular Cp y Cpk. |
| UCL | Limite de Control Superior (opcional, se puede dejar vacio para que se calcule automaticamente). |
| CL | Linea Central / promedio (opcional). |
| LCL | Limite de Control Inferior (opcional). |
| Regla 1 (on/off) | 1 punto fuera de 3sigma. Detecta puntos extremos. |
| Regla 2 (on/off) | 2 de 3 puntos consecutivos fuera de 2sigma. Detecta tendencias. |
| Regla 3 (on/off) | 4 de 5 puntos consecutivos fuera de 1sigma. Detecta desplazamientos. |
| Regla 4 (on/off) | 8 puntos consecutivos del mismo lado de CL. Detecta sesgos sostenidos. |
| Calcular limites desde datos | Boton que calcula UCL/CL/LCL/Cp/Cpk automaticamente usando las piezas existentes de la maquina. |

**Seccion Caracteristicas** (al expandir una fila):
- Lista las caracteristicas de medicion configuradas para la maquina (nombre, unidad, orden).
- Permite agregar, editar y eliminar caracteristicas.

### 5.3 Gestion de Turnos (`/dashboard/configuracion/turnos`)

Configura los turnos de produccion del sistema. Los turnos se usan para:
- Filtrar datos en el Dashboard SPC y Six Pack.
- Detectar automaticamente el turno activo cuando un inspector captura una inspeccion.

**Campos de un turno:**
- **Nombre:** Nombre descriptivo (ej: "Turno Matutino", "Turno Nocturno").
- **Hora inicio:** Hora de inicio (formato HH:MM, 24 horas).
- **Hora fin:** Hora de fin (formato HH:MM, 24 horas). Puede cruzar medianoche (ej: 22:00-06:00).
- **Activo:** Toggle para activar o desactivar el turno sin eliminarlo.

**Acciones:**
- **Nuevo turno:** Boton para crear un turno.
- **Editar:** Abre el modal de edicion del turno.
- **Eliminar:** Elimina el turno (pide confirmacion).

### 5.4 Lineas y Maquinas (`/dashboard`)

La pantalla de inicio del sistema es la **lista de lineas de produccion**.

**Vista de lineas:**
- Buscador: Filtra lineas por nombre (parametro `?q=` en la URL).
- Boton **Nueva Linea** (admin y superior): Crea una nueva linea de produccion.

**Al hacer clic en una linea**, entras a la vista de maquinas de esa linea (`/dashboard/lineas/[lineaId]`):
- **Breadcrumb** de navegacion: Lineas de Produccion > Nombre de la linea.
- Muestra todas las maquinas de la linea con su ultimo estado (ultima pieza inspeccionada).
- Boton **Agregar maquina** (admin y superior): Abre el formulario para agregar una nueva maquina a la linea.

### 5.5 Gestion de Usuarios (`/dashboard/usuarios`)

Solo disponible para el rol **Super Admin**.

**Vista principal — tabla de usuarios:**
Muestra todos los usuarios del sistema con: nombre, correo, rol (badge de color), estado activo/inactivo.

**Acciones en la tabla:**
- **Toggle activo/inactivo:** Switch para activar o desactivar un usuario sin eliminarlo.
- **Editar** (icono lapiz): Abre el modal de edicion.
- **Eliminar** (icono basura): Elimina el usuario permanentemente (no se puede eliminar el usuario propio).

**Modal Crear / Editar usuario — campos:**

| Campo | En Crear | En Editar |
|---|:---:|:---:|
| Correo electronico | SI | NO (no editable) |
| Contrasena | SI | NO |
| Nombre completo | SI | SI |
| Rol | SI | SI |
| Lineas asignadas (checkboxes) | SI | SI |
| Maquinas asignadas (checkboxes) | SI | SI |

**Roles disponibles:**
- **Super Admin:** Acceso total (incluyendo usuarios).
- **Admin:** Acceso a configuracion SPC, lineas, maquinas, turnos.
- **Supervisor:** Acceso a dashboards y alarmas, sin editar configuraciones.
- **Inspector:** Solo captura en las maquinas asignadas.

**Lineas asignadas:** Determina que lineas ve el inspector en su pantalla principal.
**Maquinas asignadas:** Determina en que maquinas puede capturar el inspector.

---

## 6. Glosario SPC

**UCL (Upper Control Limit / Limite de Control Superior)**
Valor estadistico calculado que representa el limite maximo esperado de variacion normal del proceso. Un punto por encima del UCL indica que el proceso esta fuera de control.

**LCL (Lower Control Limit / Limite de Control Inferior)**
Limite minimo esperado de variacion normal. Un punto por debajo del LCL indica que el proceso esta fuera de control.

**CL (Center Line / Linea Central)**
Promedio del proceso. Representa el valor esperado cuando el proceso esta bajo control estadistico.

**USL (Upper Specification Limit / Limite de Especificacion Superior)**
Valor maximo que define el producto como aceptable segun las especificaciones de diseno. Es un requisito del cliente o ingenieria, no una medida estadistica.

**LSL (Lower Specification Limit / Limite de Especificacion Inferior)**
Valor minimo aceptable segun las especificaciones de diseno.

**Cp (Indice de Capacidad del Proceso)**
Mide si el proceso "cabe" entre los limites de especificacion (USL-LSL), sin importar si esta centrado. Formula: Cp = (USL - LSL) / (6 * sigma). Cp >= 1.33 indica proceso capaz.

**Cpk (Indice de Capacidad Centrado)**
Igual que Cp pero considera si el proceso esta centrado respecto a las especificaciones. Es el mas importante: refleja tanto la variabilidad como el centrado. Cpk >= 1.33 = capaz, 1.00-1.33 = marginal, < 1.00 = no capaz.

**sigma (sigma / Desviacion Estandar)**
Medida de variabilidad del proceso. Una sigma mas pequeana significa que los valores son mas consistentes y predecibles.

**Subgrupo**
Conjunto de N piezas medidas en un lapso corto (mismas condiciones de produccion). Los graficos X̄-R y X̄-S trabajan con subgrupos para separar la variacion dentro del subgrupo de la variacion entre subgrupos.

**X̄-R (Media y Rango)**
Tipo de grafico de control para subgrupos de 2 a 10 piezas. Monitorea el promedio (X̄) y el rango (max - min) del subgrupo. El mas comun en produccion.

**X̄-S (Media y Desviacion Estandar)**
Tipo de grafico para subgrupos grandes (mas de 10 piezas). Usa la desviacion estandar en lugar del rango por mayor precision estadistica.

**I-MR (Individuales y Rango Movil)**
Tipo de grafico para mediciones individuales (1 pieza a la vez). Calcula el rango movil entre mediciones consecutivas. Util para procesos lentos o destructivos.

**Reglas Western Electric (WE)**
Patrones estadisticos que detectan causas especiales de variacion (no aleatoria):
- **Regla 1:** 1 punto mas alla de 3sigma. Detecta puntos extremos fuera de control inmediato.
- **Regla 2:** 2 de 3 puntos consecutivos mas alla de 2sigma (mismo lado). Detecta tendencias tempranas.
- **Regla 3:** 4 de 5 puntos consecutivos mas alla de 1sigma (mismo lado). Detecta desplazamientos del proceso.
- **Regla 4:** 8 puntos consecutivos del mismo lado de la linea central. Detecta un sesgo sostenido del proceso.

**Punto fuera de control**
Medicion que viola alguna de las Reglas Western Electric activas. No necesariamente es una pieza defectuosa (puede estar dentro de las especificaciones), pero indica que algo en el proceso cambio y debe investigarse.

**Acknowledged / Acusar alarma**
Confirmar que una alarma fue vista y esta siendo atendida. Cambia el badge de "Fuera de control" a "Acusado", registrando quien y cuando lo hizo.

**Six Pack**
Reporte de 6 graficas estadisticas que se analizan en conjunto para evaluar el comportamiento completo de un proceso: carta de control, histograma, grafica de probabilidad normal, panel de capacidad, ultimas 25 observaciones y box plot (diagrama de caja).

**Cambio de proceso**
Registro de cualquier modificacion que se haya realizado en la maquina o proceso (cambio de herramienta, ajuste de parametros, mantenimiento, etc.). Se visualiza como una linea vertical en el grafico de control para distinguir el comportamiento antes y despues del cambio.
