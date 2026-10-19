# Plan y resultados de pruebas

Estas pruebas usan Vitest con Axios y servicios simulados. Comprueban el contrato
implementado por el frontend, pero no sustituyen una prueba contra los backends
Quarkus/Python reales.

## Matriz de cobertura

| flujo | caso | tipo | resultado esperado |
|---|---|---|---|
| Login y tareas | Login valido crea sesion y la misma sesion autoriza la consulta de tareas | Camino feliz | POST conserva URL, body y timeout de 5000 ms; GET usa `owner` y `Authorization: Bearer token-1`; devuelve la lista de tareas. Implementado y aprobado. |
| Login | Usuario vacio o solo espacios | Caso borde | No invoca AuthService y muestra `Ingrese un usuario.`. Implementado y aprobado. |
| Login | Contrasena vacia o solo espacios | Caso borde | No invoca AuthService y muestra `Ingrese una contraseña.`. Implementado y aprobado. |
| Login | Respuesta 2xx sin token | Caso borde | AuthService rechaza con mensaje generico y no crea sesion. Implementado y aprobado. |
| Login | Backend de autenticacion no disponible (`ECONNREFUSED`) | Error | AuthService oculta el detalle de red y rechaza con error generico. Implementado y aprobado. |
| Login | Timeout de autenticacion (`ECONNABORTED`) | Error | AuthService rechaza con error generico; el test de contrato comprueba que Axios recibe timeout de 5000 ms. Implementado y aprobado. |
| Tareas | Backend de tareas no disponible (`ECONNREFUSED`) | Error | TasksService rechaza con `No se pudo cargar el dashboard`, sin propagar el detalle de red. Implementado y aprobado. |
| Tareas | Token rechazado por el backend (HTTP 401) | Error | TasksService presenta error generico; la sesion permanece en memoria. Dashboard deja de cargar, muestra el error y no redirige ni limpia sesion. Implementado y aprobado en pruebas de servicio y componente. |
| Tareas | No hay token o usuario de sesion | Caso borde | No hace GET y navega a `/login`. Implementado y aprobado. |
| Tareas | Respuesta 2xx cuyo body no es un array | Error / pendiente | Actualmente `.filter()` puede lanzar `TypeError`, mostrado por Dashboard. No se agrego un test que normalice este bug como comportamiento aceptable; ver pendientes. |
| Login | `user` existe pero no contiene `username` | Respuesta inesperada / pendiente | La validacion actual acepta el objeto; despues podria construirse `owner=undefined`. Falta validacion runtime; ver pendientes. |
| Login | Falla al guardar preferencias despues de autenticar | Error local / pendiente | La sesion ya se creo, pero el componente muestra error de autenticacion y no navega. No se agrego una expectativa que convierta este comportamiento confuso en contrato; ver pendientes. |
| Tareas | Request que queda pendiente | Timeout no configurado | El servicio no configura timeout propio; la UI sigue en carga hasta que Axios/navegador resuelva o rechace. No existe un timeout de tareas que pueda probarse actualmente. |

## Codigo de pruebas

El codigo completo y mantenido vive en estos archivos. Los fragmentos siguientes
son los casos agregados para los gaps identificados.

### Camino feliz login → tareas

De `src/app/services/tasks.service.spec.ts`:

```ts
it('loads tasks using the session created by a successful login', async () => {
  const tasks = [{ id: 1, title: 'Task', owner: 'student', priority: '1', status: 'TODO' }];
  vi.mocked(axios.post).mockResolvedValue({
    data: { token: 'token-1', user: { username: 'student' } }
  } as never);
  vi.mocked(axios.get).mockResolvedValue({ data: tasks } as never);
  const session = new SessionService();
  const authService = new AuthService(session);
  const tasksService = new TasksService(session);

  await authService.login({ username: 'student', password: 'Workshop123!' });
  const loadedTasks = await tasksService.getTasks(session.getUser()!.username);

  expect(loadedTasks).toEqual(tasks);
  expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/tasks?owner=student', {
    headers: { Authorization: 'Bearer token-1' }
  });
});
```

### Login: borde, backend no disponible y timeout

Los casos de campos vacios estan en `src/app/login/login.component.spec.ts`; la
respuesta sin token, el backend caido y timeout estan en
`src/app/services/auth.service.spec.ts`.

```ts
it('does not request login when the username or password is blank', async () => {
  const { component, authService } = createLogin();
  component.username = '   ';
  component.password = 'secret';

  await component.login();

  expect(authService.login).not.toHaveBeenCalled();
  expect(component.message).toBe('Ingrese un usuario.');
  expect(component.message).not.toContain('<');

  component.username = 'student';
  component.password = '   ';

  await component.login();

  expect(authService.login).not.toHaveBeenCalled();
  expect(component.message).toBe('Ingrese una contraseña.');
  expect(component.message).not.toContain('<');
});

it('returns a generic error when the login request times out', async () => {
  vi.mocked(axios.post).mockRejectedValue(Object.assign(new Error('timeout'), {
    code: 'ECONNABORTED'
  }));
  const service = new AuthService(new SessionService());

  await expect(service.login({ username: 'student', password: 'Workshop123!' }))
    .rejects.toThrow('No se pudo autenticar. Verifica tus credenciales.');
});
```

### Tareas: backend no disponible y token invalido

De `src/app/services/tasks.service.spec.ts`:

```ts
it('returns a generic error when the tasks backend is unavailable', async () => {
  vi.mocked(axios.get).mockRejectedValue(Object.assign(new Error('connect ECONNREFUSED'), {
    code: 'ECONNREFUSED'
  }));
  const session = new SessionService();
  session.setSession({ token: 'token-1', user: { username: 'student' } });

  await expect(new TasksService(session).getTasks('student'))
    .rejects.toThrow('No se pudo cargar el dashboard');
});

it('returns a generic error for an invalid token without clearing the session', async () => {
  vi.mocked(axios.get).mockRejectedValue({
    response: { status: 401, data: { detail: 'invalid token' } }
  });
  const session = new SessionService();
  session.setSession({ token: 'expired-token', user: { username: 'student' } });

  await expect(new TasksService(session).getTasks('student'))
    .rejects.toThrow('No se pudo cargar el dashboard');
  expect(session.getToken()).toBe('expired-token');
});
```

## Ejecuciones realizadas

Directorio de trabajo: raiz de `workshop-login-frontend/`.

| Comando | Codigo de salida | Resultado real |
|---|---:|---|
| `npm test` | 0 | 7 archivos aprobados, 29 pruebas aprobadas. Duracion: 1.02 s. |
| `npm run test:coverage` | 0 | 7 archivos aprobados, 29 pruebas aprobadas; 87.7% statements/lineas, 89.06% ramas y 88% funciones. Duracion: 1.27 s. Supera la meta de 85% de `REGLAS.md`. |

No se ejecuto `npm run build` en esta tarea. No se realizaron llamadas a los
backends reales; todas las respuestas HTTP de estas pruebas son mocks.

## Fallos

No hubo pruebas fallidas en las dos ejecuciones registradas. Esto no significa
que los casos pendientes de la matriz esten corregidos: no se escribieron tests
que pasen al afirmar un comportamiento defectuoso.

## Pendientes

- **Respuesta de tareas malformada:** `TasksService` devuelve `response.data`
  con un tipo estatico, sin validar que sea un array. Dashboard llama a
  `.filter()` y muestra el `TypeError`. Es un bug actual, no un resultado
  esperado que deba conservarse.
- **Usuario incompleto en login:** `AuthService` solo comprueba que `user` sea
  truthy; no comprueba `user.username`, que luego se usa como propietario de la
  consulta.
- **Error al persistir preferencias:** la sesion se establece antes de guardar
  preferencias. Si `localStorage.setItem` falla, el login presenta un mensaje
  de autenticacion fallida aunque ya exista sesion en memoria.
- **Timeout de tareas:** no hay timeout configurado en `TasksService`; un GET
  que no se resuelve conserva el indicador de carga. El timeout de 5000 ms solo
  aplica al login.

## Pruebas propuestas

No ejecutadas; requieren corregir o decidir primero los comportamientos
pendientes:

- Validar en runtime que el body de login contiene `token` no vacio y un usuario
  con `username`; probar ausencia de cada campo sin establecer sesion.
- Validar `Array.isArray(response.data)` antes de procesar tareas; ante respuesta
  malformada, comprobar que el dashboard muestra un mensaje generico y no un
  `TypeError`.
- Separar el error de persistencia de preferencias del resultado de
  autenticacion; probar que una falla de almacenamiento no se presenta como
  credenciales invalidas y deja la sesion en un estado definido.
- Decidir si las tareas deben tener deadline. Si se incorpora, agregar timeout
  configurable y probar timeout→mensaje generico→fin del estado de carga.
- Agregar una prueba de integracion con los backends locales cuando esten
  disponibles; los tests actuales verifican llamadas mockeadas, no contratos
  observados en servidor.

## Trazabilidad de H-07

H-07 se considera `Resuelto` porque la suite ya no se limita a la utilidad de
formato: contiene casos del flujo login→sesion→tareas, validacion de entradas,
errores HTTP simulados y cierre de sesion. Las referencias conectan cada parte
del hallazgo con su prueba fuente.

| Parte de H-07 | Prueba fuente | Evidencia cubierta |
|---|---|---|
| Camino feliz de login y carga de tareas | `src/app/services/tasks.service.spec.ts:27` | Login guarda token/usuario en la sesion compartida y el GET usa owner y Bearer. |
| Validacion de usuario/contrasena vacios | `src/app/login/login.component.spec.ts:39` | No se llama al servicio de autenticacion y se muestra el mensaje local. |
| Respuesta de login sin token | `src/app/services/auth.service.spec.ts:31` | No se crea sesion y se devuelve error publico. |
| Backend de login caido y timeout | `src/app/services/auth.service.spec.ts:49`; `src/app/services/auth.service.spec.ts:59` | Ambos rechazos se convierten en mensaje generico. |
| Backend de tareas caido y token invalido | `src/app/services/tasks.service.spec.ts:68`; `src/app/services/tasks.service.spec.ts:79` | Error generico; el token rechazado no borra automaticamente la sesion. |
| Reaccion de UI al error de tareas | `src/app/dashboard/dashboard.component.spec.ts:66` | Se detiene loading, se muestra error y no se redirige ni limpia sesion. |
| Estado en memoria y logout | `src/app/services/session.service.spec.ts:15`; `src/app/dashboard/dashboard.component.spec.ts:79` | Se verifica set/clear de sesion y navegacion al login. |
| Resultado cuantitativo vigente | Ejecuciones de esta tabla | 29 pruebas en 7 archivos; 87.7% de lineas, superior al umbral de 85%. |

## Documentos consultados

- `docs/ENDPOINTS.md`
- `REGLAS.md`
- `HALLAZGOS.md` (seguimiento de H-07)
