# Analisis tecnico de PLAN.md

## Dictamen

La direccion general es viable y concuerda con `docs/GOOD_PRACTICES.md`: HTTP fuera de componentes, sesion centralizada, tipos para los contratos y errores publicos consistentes. Las URLs, el metodo, los datos HTTP y el header Bearer se pueden conservar.

Antes de implementar conviene precisar tres decisiones: que la sesion se pierde al recargar, como funcionara la configuracion de entorno si hay mas de un backend/target, y como simular `localStorage` en las pruebas actuales de Vitest. El cambio reduce la exposicion persistente del token, pero no elimina el riesgo de una XSS activa.

## Alcance y seleccion

- **Seleccion de H-02:** razonable por severidad alta. El componente guarda el token en `localStorage` y el dashboard lo lee para autenticar tareas (`src/app/login/login.component.ts:47`; `src/app/dashboard/dashboard.component.ts:36`, `:44`). El servicio en memoria es una mitigacion limitada que no requiere modificar el backend.
- **Seleccion de H-04:** razonable porque ambos componentes hacen HTTP y manejan sesion/navegacion (`src/app/login/login.component.ts:41`, `:47`, `:50`; `src/app/dashboard/dashboard.component.ts:36`, `:43`, `:74`). Separar estas responsabilidades mejora la prueba y el mantenimiento.
- **Alcance declarado:** es valido dejar H-01, H-03, H-05, H-06 y H-07 fuera de la seleccion, pero seguiran pendientes en `HALLAZGOS.md`. Hay solapamiento: el plan propone retorno anticipado para parte de H-06 y agrega pruebas que ayudan a H-07. La matriz debe cambiar de estado solo cuando esos cambios esten implementados y verificados.

## Invariantes funcionales

- **Login:** conservar URL, POST, timeout, cuerpo y lectura de `data.token`/`data.user` es correcto. La implementacion actual los fija en `login.component.ts:41-45`.
- **Tareas:** conservar GET, `owner`, Bearer y procesamiento es necesario. El codigo actual excluye `ARCHIVED`, agrega etiquetas y ordena (`dashboard.component.ts:43-54`). La caracterizacion deberia comprobar el resultado de la peticion en la URL transmitida, no acoplarse a detalles internos de como Axios recibe sus opciones.
- **Navegacion y logout:** se puede conservar la navegacion actual y no llamar al backend al cerrar sesion (`login.component.ts:50`; `dashboard.component.ts:39`, `:74-77`). Con sesion en memoria, limpiar el servicio debe ocurrir antes de navegar.
- **Contrato HTTP:** la distincion del plan entre contrato HTTP y almacenamiento del cliente es correcta. Cambiar donde se guarda el token no cambia endpoint, request ni Authorization. Sin embargo, `docs/ENDPOINTS.md` actualmente describe la persistencia en `localStorage`; actualizar esa descripcion cambia el flujo interno documentado, aunque no el contrato HTTP.
- **Dependencias:** no agregar dependencias es una buena decision. `axios`, `vitest` y `@vitest/coverage-v8` ya estan declarados en `package.json`.

## H-02: token en `localStorage`

### Problema y mitigacion

El riesgo esta bien descrito: un script ejecutado en el origen puede leer un valor de `localStorage`. Un `SessionService` en memoria evita que el token quede guardado de forma persistente y permite que los componentes no manipulen almacenamiento directamente.

El limite debe quedar claro: una XSS activa todavia puede realizar acciones en nombre del usuario o acceder al estado expuesto durante la ejecucion. El cambio reduce la posibilidad de robo persistente/reutilizacion posterior, pero no reemplaza una defensa contra XSS. H-03 (`[innerHTML]`) permanece pendiente y debe atenderse por separado; Angular sanitiza el binding actual, pero no es motivo para dejar de corregir el sumidero dinamico.

### Consecuencia de la sesion en memoria

Este es el principal cambio funcional deliberado. Hoy el dashboard recupera token y usuario de almacenamiento persistente (`dashboard.component.ts:36-37`); despues de una recarga, la aplicacion ya no podra restaurar esa sesion y redirigira a `/login`. Hay que aceptar y documentar que el usuario debera volver a autenticarse. Si conservar la sesion tras recargar fuera requisito, una solucion completa requeriria soporte de backend, por ejemplo una cookie `HttpOnly` y un flujo de renovacion; eso ampliaria el alcance y el contrato, por lo que no corresponde a este plan.

En Angular, el servicio de sesion debe ser singleton de raiz (por ejemplo, `providedIn: 'root'`) para sobrevivir la navegacion entre componentes cargados de forma diferida. No debe registrarse por componente o ruta si se espera compartir el mismo token.

### Archivos propuestos

- `SessionService`: apropiado para el token y el usuario en memoria. Sus pruebas deben verificar inicializacion vacia, establecer/leer sesion y limpiar todos sus datos.
- `AuthService`: apropiado para encapsular el POST y entregar una respuesta tipada. Conviene definir si el servicio tambien actualiza la sesion o si esa coordinacion queda en el componente; elegir una sola responsabilidad y probarla.
- Componentes de login/dashboard: deben dejar de acceder a `localStorage` para token/usuario. Navegacion, estados de carga y presentacion pueden seguir en los componentes.
- `docs/ENDPOINTS.md`: se debe actualizar solo la explicacion del almacenamiento cliente y la consecuencia ante recarga. No cambiar los apartados de metodo, URL, timeout, cuerpo, respuesta o Bearer.
- Preferencias: pueden seguir persistidas por separado. Extraerlas a `PreferencesService` evita que el componente maneje `localStorage`, pero es una extraccion adicional: mantenerla pequena y comprobar que conserva `workshop_preferences`.

### Prueba de caracterizacion

La secuencia propuesta es correcta: primero capturar el comportamiento vigente y, tras la migracion, cambiar unicamente la expectativa de persistencia por la nueva garantia de no persistir el token. El entorno de Vitest configurado es `node` (`vitest.config.ts:4-5`), por lo que no debe asumirse que existe `window.localStorage`. Para caracterizar el codigo actual se necesita instalar un doble global de `localStorage` (por ejemplo, con `vi.stubGlobal`) y restaurarlo en limpieza; no hace falta agregar JSDOM solo para estas pruebas.

La prueba actual de login debe verificar persistencia antes del cambio, pero la prueba de seguridad posterior debe verificar que `workshop_token` no se escribe y que logout deja vacia la sesion. No presentar ambas expectativas como simultaneas.

## H-04: responsabilidades y estructura Angular

### Problema

La caracterizacion del acoplamiento es correcta. `LoginComponent` realiza Axios, escribe almacenamiento y navega; `DashboardComponent` lee almacenamiento, hace Axios, transforma tareas, administra estados y navega. Es una mezcla que dificulta aislar fallos y cambios de endpoint.

### Evaluacion de los cambios propuestos

- **`AuthService` y `TasksService`:** encajan directamente con las practicas del repositorio. Las llamadas Axios deben vivir ahi, y los componentes consumir metodos de dominio. Evitar que los servicios devuelvan errores crudos que luego cada componente interprete de forma distinta.
- **`environment.ts`:** es apropiado para sacar URLs de los componentes y sigue `GOOD_PRACTICES.md`. En el `angular.json` actual no hay `fileReplacements`; crear solo `environment.ts` centraliza valores, pero no crea automaticamente configuraciones distintas para desarrollo/produccion. Si ese es el objetivo, agregar y validar reemplazos por configuracion. Si no se necesitan targets diferentes aun, describirlo como centralizacion de configuracion, no como cambio completo de ambiente. Las URLs son configuracion publica, no secretos.
- **Sesion y preferencias:** centralizar token/usuario en `SessionService` y mantener preferencias separadas es una division comprensible. Debe existir una sola via de lectura/escritura para cada clase de estado y claves de almacenamiento no dispersas.
- **Presentacion frente a transformacion:** conservar filtro, etiqueta y orden es necesario, pero el plan no asigna con precision su ubicacion. Una funcion pura de transformacion de tareas (testeable sin HTTP) evita que `TasksService` se convierta en un servicio con responsabilidades de UI y evita devolver listas ya mutadas. Si la regla solo se usa en el dashboard, puede mantenerse como transformacion local bien tipada; no crear una abstraccion hasta que aporte valor.
- **Tipos:** definir interfaces DTO de login y tareas en los limites del servicio es correcto. Tipar tambien la forma de usuario y manejar errores de Axios como `unknown`/tipo estrecho evita que `any` reaparezca en los componentes. El plan no necesita resolver todo H-05; el resto de los `any` puede quedar explicitamente para ese hallazgo.
- **Errores:** no exponer `response.data.message` o `detail` sin filtrar es una mejora de seguridad y consistencia. Definir mensajes publicos estables para autenticacion y carga de tareas; conservar el fallback de error generico. Probar que los detalles internos no se muestran. Esto cambia el texto visible, no el contrato HTTP.
- **Retorno anticipado y valores magicos:** retorno anticipado es adecuado para las validaciones anidadas de login (`login.component.ts:33-39`). No normalizar el usuario al enviarlo salvo que se decida como cambio funcional: hoy se usa el valor capturado en el cuerpo. URLs, timeout y claves deben quedar centralizados en la configuracion o en el servicio propietario.
- **Zona de Angular:** el dashboard entra manualmente en `NgZone` y llama a `detectChanges()` al resolver Axios (`dashboard.component.ts:57-69`). Extraer Axios a servicios no demuestra por si solo que esa logica sea innecesaria. Mantenerla inicialmente o probar el comportamiento en navegador antes de retirarla; las pruebas unitarias en entorno `node` no verifican deteccion de cambios real.

### Archivos propuestos

La lista es viable, pero es amplia para dos hallazgos. Compartir una sola implementacion de `SessionService` y su spec entre H-02/H-04; evitar crear specs duplicados para el mismo comportamiento. Las pruebas de servicio deben comprobar solicitudes, errores y sesion; las de componente, validacion, estados visibles y navegacion. Los componentes standalone se pueden probar directamente con dobles, pero el constructor del login accede a `localStorage` al inicializar preferencias (`login.component.ts:24`), asi que tambien requerira un global simulado en Vitest `node`.

`src/environments/environment.ts` es nuevo en este plan. Verificar que el builder de Angular compile el import y que, si se agrega `fileReplacements`, se configure en el target que realmente se usa. No crear configuraciones de entorno que no se vayan a mantener.

### Pruebas de caracterizacion

Los casos propuestos cubren el nucleo del flujo. Precisiones recomendadas:

1. Login valido: afirmar metodo, URL final, cuerpo, timeout, almacenamiento vigente y navegacion; incluir respuesta sin token y rechazo de red/backend.
2. Dashboard: comprobar ausencia de token, Bearer, usuario en query, lista vacia, exclusión de archivadas, prioridad y estado de error. Comprobar que `loading` termina tanto en exito como en fallo.
3. Logout: verificar limpieza antes de navegar, sin llamada de red, y que las preferencias se conservan.
4. Usar dobles de Router, Axios, `NgZone`, `ChangeDetectorRef` y almacenamiento global. Restaurar mocks entre pruebas para evitar estado compartido.
5. Despues de extraer, probar la semantica HTTP en los servicios y dejar en componentes las aserciones de coordinacion/presentacion. No probar detalles privados de implementacion.

## Secuencia y validacion

Los pasos incrementales y correr `npm test` en cada paso son adecuados. `npm run build` comprueba integracion Angular que Vitest no cubre. `npm run test:coverage` es pertinente porque ya existe provider V8. La meta de 85% corresponde al codigo modificado segun `REGLAS.md`; no debe usarse para excluir ramas relevantes ni reducir los quality gates.

La prueba de caracterizacion inicial debe pasar antes de cambiar el comportamiento. Despues de elegir sesion en memoria, actualizar la expectativa de recarga: con la aplicacion reiniciada no hay token y se redirige al login. Documentar esa decision como comportamiento esperado, no como regresion accidental.

## Conclusion

Aprobar el plan con ajustes menores antes de implementarlo:

1. Registrar explicitamente la perdida de sesion tras recarga como decision funcional aceptada.
2. Aclarar si `environment.ts` solo centraliza URLs o si habra varios targets; agregar `fileReplacements` unicamente si se requieren.
3. Indicar el doble de `localStorage` necesario por el entorno Vitest `node`.
4. Definir donde vive la transformacion/orden de tareas y conservar inicialmente la deteccion de cambios hasta comprobar que puede retirarse.
5. Mantener H-03 como riesgo residual y coordinar el estado de H-06/H-07 si el trabajo termina resolviendo parte de esos hallazgos.

No se modifico codigo ni se ejecuto una implementacion del plan; este documento es una revision tecnica de su viabilidad.
