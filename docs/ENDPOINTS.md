# Contrato de endpoints

Este documento describe lo que el frontend implementa hoy. Los servicios
externos se esperan en las URLs locales indicadas en `src/environments/environment.ts`.
Los ejemplos de respuesta se basan en los fixtures de Vitest; no son capturas de
respuestas verificadas contra los backends.

## Endpoint 1: login

### 1. Quien lo llama

`LoginComponent.login()` llama a `AuthService.login()`. `AuthService` realiza el
POST y, si la respuesta es aceptada, entrega token y usuario a `SessionService`.
La URL, el timeout y el identificador de cliente se leen de la configuracion de
frontend.

Implementacion: `src/app/login/login.component.ts`,
`src/app/services/auth.service.ts`, `src/app/services/session.service.ts` y
`src/environments/environment.ts`.

### 2. Que envia

- Metodo: `POST`
- URL: `http://localhost:8080/auth/login`
- Timeout configurado: 5000 ms.
- No se configuran headers propios ni `Authorization`. El servicio entrega un
  objeto como cuerpo a Axios; el codigo de la app no fija manualmente el header
  `Content-Type`.

| Parte | Campo | Tipo/valor enviado | Origen o regla |
|---|---|---|---|
| Header | Headers propios de la app | Ninguno | `AuthService` solo pasa el timeout en la configuracion Axios. |
| Body | `username` | string | Valor ingresado; se comprueba que no sea blanco usando `trim()`, pero se envia el valor original. |
| Body | `password` | string | Valor ingresado; se comprueba que no sea blanco usando `trim()`, pero se envia el valor original. |
| Body | `client` | `angular-workshop` | `environment.loginClientId`. |

Ejemplo de cuerpo usado por `auth.service.spec.ts`:

```json
{
  "username": "student",
  "password": "Workshop123!",
  "client": "angular-workshop"
}
```

El servicio no especifica un body adicional ni envia el token en esta llamada.

### 3. Que espera recibir en exito

Axios acepta por defecto respuestas HTTP 2xx; el servicio no exige un codigo
concreto como `200` o `201` ni lee `response.status`. El cuerpo JSON se recibe en
`response.data`.

| Campo del body | Tipo esperado por el frontend | Uso/validacion |
|---|---|---|
| `token` | string | Debe ser truthy; se guarda en memoria. No se valida formato, firma ni expiracion en el cliente. |
| `user` | objeto `User` | Debe ser truthy. La interfaz define `username` como string y `displayName` opcional; el servicio no valida esos campos en runtime. |
| `user.username` | string | Se usa despues como query `owner` en la consulta de tareas. |
| `user.displayName` | string opcional | Se muestra en el saludo si existe; de lo contrario se muestra `username`. |

Ejemplo de body tomado del fixture de `auth.service.spec.ts` (no confirmado con
el backend real):

```json
{
  "token": "token-1",
  "user": {
    "username": "student"
  }
}
```

Al recibirlo, `AuthService` guarda la sesion en memoria. Luego `LoginComponent`
guarda las preferencias en `workshop_preferences` y navega a `/dashboard`.

### 4. Errores y reaccion de la UI

| Caso | Comportamiento del frontend | Resultado visible |
|---|---|---|
| Usuario o contrasena en blanco | Validacion local; no se llama al endpoint. | `Ingrese un usuario.` o `Ingrese una contraseña.` |
| HTTP no-2xx, error de red o timeout de 5000 ms | Axios rechaza; `AuthService` oculta el detalle y rechaza con un error generico. | `LoginComponent` muestra `No se pudo autenticar.`; permanece en login y restablece el estado `busy`. |
| Respuesta 2xx sin `token` truthy o sin `user` truthy | `AuthService` la trata como respuesta inesperada y sigue la misma ruta de error generico. | `No se pudo autenticar.`; no guarda la sesion ni navega. |
| Token no vacio pero invalido para la API de tareas | Login no comprueba su validez. Se guarda en memoria; la consulta posterior de tareas falla como error de autorizacion. | El dashboard muestra `No se pudo cargar el dashboard`; no borra la sesion ni redirige automaticamente. |
| Falla `PreferencesService.save()` despues del login exitoso | La sesion ya fue guardada en memoria antes de escribir preferencias; la excepcion cae en el `catch` del componente. | Muestra `No se pudo autenticar.` y no navega, aunque la sesion queda en memoria. |

El texto del error de login no incorpora el usuario ni el mensaje del backend.

### 5. Notas de seguridad

- El token se mantiene en `SessionService` en memoria; no se guarda en
  `localStorage`. Al recargar la aplicacion se pierde la sesion y el usuario
  debe autenticarse otra vez.
- `environment.ts` contiene URLs e identificador de cliente publicos, no
  secretos. No hay un client secret en el frontend.
- Los mensajes se muestran con interpolacion Angular; la plantilla no usa
  `[innerHTML]` y el componente asigna texto plano, no markup.
- El texto generico evita exponer al usuario los detalles de error recibidos del
  backend.

## Endpoint 2: consulta de tareas

### 1. Quien lo llama

Durante `DashboardComponent.ngOnInit()`, el componente obtiene usuario y token
de `SessionService` y llama a `TasksService.getTasks(user.username)`. El servicio
construye y realiza el GET.

Implementacion: `src/app/dashboard/dashboard.component.ts`,
`src/app/services/tasks.service.ts` y `src/app/services/session.service.ts`.

### 2. Que envia

- Metodo: `GET`
- URL base: `http://localhost:8000/api/tasks`
- No envia body.

| Parte | Campo | Tipo/valor enviado | Origen o regla |
|---|---|---|---|
| Query | `owner` | string codificado para URL | `SessionService.getUser().username`; se aplica `encodeURIComponent`. |
| Header | `Authorization` | `Bearer <token>` | Token actual de `SessionService`. |
| Header/body | Otros headers o body | Ninguno configurado por `TasksService` | La llamada Axios solo recibe `headers.Authorization`; no establece timeout. |

Ejemplo tomado de `tasks.service.spec.ts`:

```http
GET http://localhost:8000/api/tasks?owner=student
Authorization: Bearer token-1
```

Si `owner` contiene espacios, se codifica; el test usa `a b` y espera
`owner=a%20b`.

### 3. Que espera recibir en exito

Axios acepta por defecto respuestas HTTP 2xx; el codigo no exige un status
exacto. `TasksService` devuelve `response.data` tipado como `Task[]`, pero no
valida la forma del JSON en runtime.

| Campo del elemento | Tipo declarado | Uso en la UI |
|---|---|---|
| `id` | number o string, opcional | No se muestra actualmente. |
| `status` | string, opcional | Se excluye `ARCHIVED`; los estados conocidos se traducen a etiquetas en español. |
| `priority` | string o number, opcional | Se usa para ordenar y para formar la etiqueta. |
| `owner` | string, opcional | Se usa para formar la etiqueta. |
| `title` | string, opcional | Se muestra como titulo. |
| `description` | string, opcional | Se muestra como descripcion. |
| `label` | string, opcional en el modelo | La UI la calcula a partir de prioridad y propietario; no es necesaria en la respuesta del endpoint. |

Ejemplo de body usado como fixture en `tasks.service.spec.ts` (no confirmado
con el backend real):

```json
[
  {
    "id": 1,
    "title": "Task",
    "owner": "student",
    "priority": "1",
    "status": "TODO"
  }
]
```

La UI filtra tareas con estado `ARCHIVED`, construye `label` en mayusculas con
los valores de `priority` y `owner` (o `NORMAL`/`SIN-ASIGNAR` si faltan) y ordena
por prioridad descendente. Cuando ambas prioridades son strings, la comparacion
es lexicografica. Los estados `TODO`, `IN_PROGRESS`, `DONE`, `RESUELTO` y
`COMPLETED` tienen etiquetas traducidas; otros estados se muestran como llegan.

### 4. Errores y reaccion de la UI

| Caso | Comportamiento del frontend | Resultado visible |
|---|---|---|
| No hay token o usuario de sesion | `DashboardComponent` no invoca `TasksService` y navega a `/login`. | Se muestra la pantalla de login. |
| HTTP no-2xx, incluido token rechazado (por ejemplo, 401/403 si el backend usa esos codigos), o error de red | `TasksService` convierte cualquier rechazo Axios en `No se pudo cargar el dashboard`; no distingue el status ni limpia la sesion. | Dashboard deja `loading`, muestra ese mensaje y permanece en la ruta. |
| Conexion que no responde | `TasksService` no configura timeout. No hay un limite de tiempo propio de la app; mientras la promesa siga pendiente, la UI conserva el estado de carga. Si la red termina rechazando, aplica el caso anterior. | Skeleton de carga hasta exito o rechazo. |
| Respuesta 2xx cuyo body no es un array | `TasksService` devuelve el body sin validar. Al ejecutar `.filter()`, el dashboard puede lanzar un `TypeError`; su `catch` muestra `error.message`. | Se oculta la lista y puede aparecer un mensaje tecnico de JavaScript. |
| Elementos con campos opcionales ausentes | No se rechaza el elemento. Etiqueta usa fallbacks; interpolaciones de titulo/descripcion pueden quedar vacias. | La tarea puede aparecer con datos incompletos. |

### 5. Notas de seguridad

- El bearer se obtiene de `SessionService` en memoria, no de `localStorage`.
  Un script malicioso ejecutandose en el mismo origen aun podria actuar durante
  la sesion activa; la memoria evita persistir el token, no elimina el riesgo de
  XSS activa.
- Las tareas se renderizan mediante interpolacion Angular, no mediante
  `[innerHTML]`.
- Los errores HTTP del backend se reemplazan por un mensaje generico. Una
  respuesta 2xx malformada puede producir un error local que se muestra en la
  UI, como se describe arriba.
- Logout limpia la sesion del cliente, pero no hace una llamada de revocacion al
  backend.

## Cierre de sesion local (sin endpoint)

`DashboardComponent.logout()` llama a `SessionService.clear()` y navega a
`/login`. No hay request HTTP de logout. Las preferencias `workshop_preferences`
se conservan; el token y el usuario en memoria desaparecen. La revocacion o
expiracion del token en el backend no se puede confirmar desde este frontend.

## Preguntas abiertas

- Que codigo HTTP exacto devuelve cada backend en exito y en credenciales/token
  invalidos. El frontend solo se apoya en el comportamiento 2xx/no-2xx de Axios;
  los tests usan mocks, no una instancia real del backend.
- Si el backend garantiza `user.username` y un array de tareas con campos
  concretos. Las interfaces TypeScript no validan respuestas reales en runtime.
- Si `priority` representa numeros, texto ordenable lexicograficamente o una
  escala de negocio. El modelo permite string y number, pero no define el orden
  esperado para valores textuales.

## Documentos consultados

- `README.md` (servicios locales y uso de laboratorio).
- `RETO.md` (comportamiento que se practica preservar).
- `REGLAS.md` (endpoints, pruebas y seguridad del laboratorio).
- `docs/GOOD_PRACTICES.md` (sesion, servicios, errores y contenido HTML).
- `PLAN.md` (flujo aprobado de sesion en memoria y contratos a preservar).
- `HALLAZGOS.md` (estado actual de riesgos relacionados).
- `docs/ENDPOINTS.md` anterior (contraste de las notas legacy que se sustituyen).