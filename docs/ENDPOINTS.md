# Contrato de endpoints

Este documento refleja el flujo implementado actualmente por el frontend. Los
servicios deben estar disponibles localmente en los puertos indicados en
`README.md`.

## 1. Login

- Metodo: `POST`
- URL: `http://localhost:8080/auth/login`
- Timeout: 5000 ms
- Cuerpo JSON: `username`, `password` y `client` con valor `angular-workshop`.
- Respuesta esperada: `data.token` y `data.user`.
- En exito, `AuthService` guarda `token` y `user` en la sesion en memoria
  (`SessionService`), conserva las preferencias en `localStorage` bajo
  `workshop_preferences` y navega a `/dashboard`.
- La sesion en memoria se pierde al recargar la aplicacion; el usuario debe
  autenticarse de nuevo. Esto no cambia el contrato HTTP.
- Si no hay token, muestra el mensaje de respuesta sin token. Ante error usa
  `response.data.message`, el mensaje del error o un texto generico.

## 2. Consulta de tareas

- Metodo: `GET`
- URL base: `http://localhost:8000/api/tasks`
- Query: `owner`, formado con `user.username`.
- Autorizacion: `Authorization: Bearer <token>` obtenido de `SessionService`.
- Respuesta esperada: `data` como lista de tareas. El dashboard usa los campos
  `status`, `priority`, `owner`, `title` y `description`.
- Las tareas `ARCHIVED` no aparecen en la lista visible. Las restantes se
  etiquetan con prioridad y propietario y se ordenan por prioridad descendente.
- Si no hay token, el dashboard redirige a `/login`. Si falla la consulta,
  muestra `response.data.detail`, el mensaje del error o un texto generico.

## 3. Cierre de sesion

- No se realiza una llamada al backend.
- Se limpia la sesion en memoria mediante `SessionService` y se navega a
  `/login`.
- `workshop_preferences` no se elimina.

## Referencias de implementacion

- Login: `src/app/services/auth.service.ts:14` y
  `src/app/services/auth.service.ts:21`.
- Consulta y autorizacion de tareas: `src/app/services/tasks.service.ts:19` y
  `src/app/services/tasks.service.ts:20`.
- Sesion y cierre de sesion: `src/app/services/session.service.ts:16` y
  `src/app/dashboard/dashboard.component.ts:79`.