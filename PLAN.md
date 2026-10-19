## Aprobación humana
Aprobado por: Rosana Bermeo
Fecha: 2026-10-19
Alcance: Implementar H-02 y H-04 según este plan, aceptando que la sesión en memoria se pierde al recargar y que habrá que iniciar sesión de nuevo.

# Plan de correccion

## Alcance y seleccion

Se proponen cambios para estos hallazgos confirmados que siguen en estado
`Pendiente` en `HALLAZGOS.md`:

- **H-02, Token de autenticacion en `localStorage`**: prioridad por severidad
  alta y por la posibilidad de que JavaScript del mismo origen lea un token
  persistido.
- **H-04, Componentes acoplados a HTTP, URLs, sesion y navegacion**: prioridad
  por ser un cambio arquitectonico acotable a los componentes de login y
  dashboard, que tambien permite centralizar la sesion de H-02.

No se incluyen otros hallazgos en este plan.

## Invariantes funcionales

- Mantener `POST http://localhost:8080/auth/login`, el timeout de 5000 ms, el
  cuerpo `{ username, password, client: 'angular-workshop' }` y el uso de
  `data.token` / `data.user`.
- Mantener `GET http://localhost:8000/api/tasks`, el query `owner`, el header
  `Authorization: Bearer <token>` y el procesamiento actual de tareas,
  incluido excluir `ARCHIVED` y ordenar por prioridad descendente.
- Mantener la navegacion de login exitoso a `/dashboard`, la redireccion a
  `/login` sin sesion y el cierre de sesion local sin llamada al backend.
- No cambiar rutas, metodos, cuerpos, respuestas ni autenticacion HTTP descritos
  en `docs/ENDPOINTS.md`. La politica de almacenamiento del token es interna al
  cliente, no parte del contrato HTTP.
- No agregar dependencias. Reutilizar Axios, Vitest y las herramientas ya
  presentes.

## H-02 — Token de autenticacion en `localStorage`

### Problema

El token queda persistido y puede ser leido por cualquier script que se ejecute
en el origen. Una XSS podria extraerlo y usarlo en solicitudes autenticadas.
Moverlo a memoria reduce la exposicion persistente, pero no protege contra una
XSS activa mientras la aplicacion esta abierta.

### Cambio propuesto

Centralizar token y usuario en un `SessionService` de memoria. El login guardara
la respuesta validada en ese servicio; el dashboard obtendra de alli el token
para que `TasksService` envie el mismo header Bearer; logout limpiara la sesion.
No guardar el token ni el usuario en `localStorage`. Conservar las preferencias
del usuario por separado. Tras una recarga completa, la sesion en memoria se
pierde y el usuario debera autenticarse otra vez; es el compromiso acotado para
no introducir cambios en el backend ni en el contrato HTTP.

### Archivos a tocar

- `src/app/services/session.service.ts` (nuevo): estado de sesion en memoria.
- `src/app/services/session.service.spec.ts` (nuevo): contrato de almacenamiento
  y limpieza de sesion.
- `src/app/services/auth.service.ts` (nuevo): login tipado y coordinacion con la
  sesion.
- `src/app/login/login.component.ts`: consumir el servicio, sin escribir el
  token ni el usuario directamente en almacenamiento persistente.
- `src/app/dashboard/dashboard.component.ts`: consultar y limpiar la sesion a
  traves de servicios, sin leer claves de autenticacion del navegador.
- `src/app/login/login.component.spec.ts` y
  `src/app/dashboard/dashboard.component.spec.ts` (nuevos): caracterizacion y
  regresion del flujo de autenticacion.
- `docs/ENDPOINTS.md`: actualizar unicamente la nota de almacenamiento local
  para describir la sesion en memoria; preservar sin cambios los contratos HTTP
  y el flujo funcional enumerados arriba.

### Prueba de caracterizacion antes de tocar implementacion

Crear pruebas Vitest para comprobar el comportamiento observable actual del
login exitoso (almacena la sesion y navega a `/dashboard`), del dashboard
(redirige sin token y envia el bearer cuando hay sesion) y del logout (limpia la
sesion y navega a `/login`). Ejecutarlas contra los componentes actuales antes
de modificarlos. Durante la migracion, conservar esas aserciones de flujo y
agregar la regresion de seguridad: el token no se persiste en `localStorage` y
deja de estar disponible al limpiar el servicio.

## H-04 — Componentes acoplados a HTTP, URLs, sesion y navegacion

### Problema

`LoginComponent` y `DashboardComponent` mezclan peticiones Axios, URLs, acceso a
sesion, transformacion/estado de vista y navegacion. Esto acopla las pruebas a
los componentes y hace que cambios de endpoint o almacenamiento obliguen a
modificar la UI.

### Cambio propuesto

- Crear `AuthService` y `TasksService` para alojar sus respectivas llamadas
  HTTP; los componentes no importaran Axios.
- Centralizar la URL del backend y la configuracion de timeout en
  `src/environments/environment.ts`, siguiendo las convenciones del proyecto.
- Mantener la sesion bajo `SessionService`; extraer la persistencia de
  preferencias a `PreferencesService` para que el componente no gestione
  directamente `localStorage` ni claves magicas.
- Limitar los componentes a estado/presentacion y coordinacion de navegacion;
  conservar el filtrado, etiquetado y orden visible de las tareas sin duplicar
  logica.
- Definir interfaces para el request/respuesta de login, usuario y tarea; no
  introducir `any` en los limites de los servicios.
- Normalizar errores en los servicios con mensajes publicos consistentes, sin
  mostrar detalles internos del backend.
- Usar retorno anticipado para las validaciones de login. Mantener URL, clave y
  timeout fuera de los componentes; no sumar abstracciones que no tengan un
  unico uso concreto.

### Archivos a tocar

- `src/app/services/auth.service.ts` y
  `src/app/services/auth.service.spec.ts` (nuevos).
- `src/app/services/tasks.service.ts` y
  `src/app/services/tasks.service.spec.ts` (nuevos).
- `src/app/services/session.service.ts` y
  `src/app/services/session.service.spec.ts` (nuevos; compartidos con H-02).
- `src/app/services/preferences.service.ts` y
  `src/app/services/preferences.service.spec.ts` (nuevos).
- `src/environments/environment.ts` (nuevo): URLs y timeout configurables.
- `src/app/login/login.component.ts` y
  `src/app/dashboard/dashboard.component.ts`: inyectar servicios y retirar las
  responsabilidades de HTTP/almacenamiento directo.
- `src/app/login/login.component.spec.ts` y
  `src/app/dashboard/dashboard.component.spec.ts` (nuevos): caracterizacion de
  validacion, estados de carga/error, navegacion y flujo de tareas.
- `docs/ENDPOINTS.md`: documentar la nueva ubicacion de URLs y el cambio interno
  de almacenamiento cuando corresponda, sin alterar los endpoints ni sus
  contratos.

### Prueba de caracterizacion antes de tocar implementacion

Agregar pruebas a los componentes actuales con Axios, Router, `localStorage`,
`NgZone` y `ChangeDetectorRef` sustituidos por dobles. Verificar: URL, metodo,
timeout y cuerpo exactos del login; URL de tareas, query `owner` y header
Bearer; rechazo de respuesta de login sin token; redireccion sin sesion; filtro
de tareas archivadas y orden; y limpieza de sesion/navegacion al cerrar sesion.
Ejecutar la suite antes de extraer servicios. Despues, trasladar las aserciones
de protocolo a pruebas de servicios y conservar en las de componentes las
aserciones de presentacion y navegacion.

## Secuencia y validacion

1. Escribir y ejecutar las pruebas de caracterizacion descritas arriba antes de
   editar los componentes.
2. Extraer servicios, tipos y configuracion en cambios pequenos; ejecutar
   `npm test` despues de cada paso.
3. Verificar que URLs, cuerpos, query, Bearer, resultados visibles y navegacion
   siguen iguales; comprobar que logout invalida la sesion en memoria.
4. Ejecutar `npm run build` y `npm run test:coverage`. Mantener los quality gates
   existentes y buscar cobertura de al menos 85% en el codigo modificado, como
   exige `REGLAS.md`.

La configuracion actual de Vitest usa entorno `node`; las pruebas pueden
instanciar los componentes con dobles y probar los servicios directamente, sin
anadir un entorno DOM ni nuevas dependencias.