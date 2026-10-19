# Plan de correccion y seguimiento: H-01, H-03 y H-08

> Alcance confirmado para las correcciones: H-01 y H-03. En el estado actual
> de `HALLAZGOS.md`, ambos figuran como `Resuelto`; este documento describe por
> separado la correccion aplicada y las pruebas que debian caracterizar el
> comportamiento antes del cambio. Se agrega H-08 como seguimiento: al no
> encontrarse duplicacion demostrable, no se propone una refactorizacion.

## Item: H-01

### Item de HALLAZGOS.md

Dependencias `axios` y `lodash` con avisos de seguridad. Estado actual:
`Resuelto`.

### Problema

Las versiones anteriores declaradas (`axios@0.31.0` y `lodash@4.17.21`) estaban
dentro de rangos afectados por advisories de npm. El alcance de este item son
estas dos dependencias directas; no implica que todo el arbol de dependencias
este libre de vulnerabilidades.

### Cambio propuesto / aplicado

- Actualizar Axios y Lodash a versiones publicadas sin los advisories directos
  reportados para las versiones anteriores: `axios@1.20.0` y `lodash@4.18.1`.
- Mantener versiones exactas y sincronizar el lockfile con `npm install` para
  que la resolucion sea reproducible.
- No usar `npm audit fix --force`, no ocultar avisos y no bajar el umbral del
  scanner. Registrar por separado las vulnerabilidades que sigan en otras
  dependencias transitivas o directas.
- Conservar el uso actual: Axios sigue realizando las peticiones HTTP y Lodash
  sigue combinando las preferencias guardadas.

### Archivos a tocar

- `package.json`: versiones exactas de Axios y Lodash.
- `package-lock.json`: resolucion e integridad actualizadas. En el estado local
  consultado este archivo esta sin seguimiento por Git; debe incluirse en el
  control de versiones para que la actualizacion sea reproducible en otros
  entornos.
- `src/app/services/auth.service.spec.ts`: comprobar que el POST conserva URL,
  body y timeout despues de cambiar Axios.
- `src/app/services/preferences.service.spec.ts`: comprobar que defaults,
  merge, JSON invalido y guardado siguen funcionando despues de cambiar Lodash.
- `HALLAZGOS.md`: conservar H-01 como `Resuelto` con las versiones verificadas y
  aclarar que el estado no significa que todo `npm audit` quede limpio.

### Prueba que debia escribirse antes de tocar dependencias

1. Capturar el resultado de `npm audit --json` antes del cambio e identificar
   especificamente los advisories atribuibles a Axios y Lodash, sin modificar
   ni ignorar el umbral.
2. Ejecutar las pruebas existentes de `AuthService` y `PreferencesService` como
   caracterizacion del comportamiento funcional previo.
3. Tras actualizar, repetir `npm audit --json` y comprobar que Axios/Lodash ya
   no aparecen como vulnerabilidades, y repetir esas pruebas para confirmar que
   los contratos de login y preferencias se conservan.

La auditoria posterior reporto que Axios y Lodash ya no estan entre los paquetes
vulnerables, aunque quedan advisories de otras dependencias. Esos avisos deben
seguir visibles y requieren seguimiento separado.

## Item: H-03

### Item de HALLAZGOS.md

Mensaje de login renderizado anteriormente con `[innerHTML]`. Estado actual:
`Resuelto`.

### Problema

El template trataba el mensaje como HTML. Aunque los textos actuales eran
controlados, ese sink podia volver inseguro el flujo si mas adelante se
concatenaban datos del usuario o detalles del backend.

### Cambio propuesto / aplicado

- Representar el mensaje como texto con interpolacion Angular (`{{ message }}`),
  que escapa contenido en lugar de interpretarlo como markup.
- Guardar en `message` texto plano, sin etiquetas `<strong>`.
- Mantener los mensajes genericos y no incluir username ni detalles de error
  del backend.
- No usar `DomSanitizer` ni marcar contenido como confiable; el mensaje no
  necesita HTML.

### Archivos a tocar

- `src/app/login/login.component.html`: reemplazar `[innerHTML]` por
  interpolacion.
- `src/app/login/login.component.ts`: asignar mensajes de texto plano.
- `src/app/login/login.component.spec.ts`: comprobar mensajes literales y que
  no contengan markup.
- `HALLAZGOS.md`: mantener H-03 como `Resuelto` con evidencia del template y
  del componente.

### Prueba que debia escribirse antes de tocar la plantilla

1. Caracterizar validaciones de usuario/contrasena vacios y errores de login:
   comprobar el texto exacto que se presenta y que no concatena datos del
   usuario ni el detalle del backend.
2. Agregar una comprobacion de plantilla que confirme que el mensaje usa
   interpolacion y no `[innerHTML]`; si se requiere renderizar el componente,
   usar el harness Angular compatible con el entorno de pruebas existente, sin
   introducir dependencias ni cambiar los quality gates.
3. Despues del cambio, ejecutar las pruebas del componente y confirmar que los
   mensajes siguen siendo los mismos en pantalla como texto, incluso si una
   cadena contiene caracteres `<` o `>`.

La prueba actual confirma mensajes exactos y ausencia de `<` en el estado del
componente. La plantilla tambien fue verificada directamente y no contiene
`[innerHTML]`.

## Item: H-08

### Item de HALLAZGOS.md

Logica duplicada entre componentes. Estado actual: `No encontrado`.

### Analisis y decision

Se revisaron los limites actuales: `LoginComponent` delega autenticacion a
`AuthService`; `DashboardComponent` delega la consulta a `TasksService` y usa
`SessionService` para leer/limpiar la sesion. El acceso a la sesion en login y
dashboard ocurre en fases diferentes y no constituye por si mismo un bloque
duplicado.

No hay un cambio de codigo justificable para este item. No extraer servicios ni
funciones adicionales sin encontrar primero comportamiento repetido concreto.

### Archivos y evidencia

- `src/app/login/login.component.ts:43`: delega el login a `AuthService`.
- `src/app/dashboard/dashboard.component.ts:54`: delega la carga a
  `TasksService`.
- `src/app/services/auth.service.ts:14`: contiene la llamada POST.
- `src/app/services/tasks.service.ts:19`: contiene la llamada GET.
- `HALLAZGOS.md`: conserva H-08 como `No encontrado` con estas referencias.

### Prueba previa

No se agrega una prueba de extraccion porque no se encontro codigo duplicado que
corregir. Si una revision posterior identifica el mismo comportamiento
implementado en dos sitios, primero se debe escribir una prueba de
caracterizacion que compare sus resultados actuales; despues se puede extraer
la logica y ejecutar esa prueba contra el codigo compartido.

## Registro de alcance

- No se modifica `docs/ENDPOINTS.md`: los contratos HTTP no cambian en ninguno
  de estos items.
- H-01 y H-03 ya estan `Resuelto`; no se cambia su estado.
- H-08 permanece `No encontrado`; no se fuerza una correccion sin duplicacion
  comprobada.
- En esta actualizacion solo se documenta el seguimiento; no se modifica codigo.