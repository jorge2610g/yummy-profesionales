# Yummy Profesionales — Contexto y continuidad

Última actualización: 2026-09-24 (America/Santiago)

## CLON COMPLETO DE RESTAURANTE — 2026-09-24

Profesionales parte ahora de una copia completa de `yummy-restaurante`, no solo del panel.

Validación:
- 30 archivos del repositorio fuente (todos salvo `CNAME`) coinciden por SHA con Profesionales.
- `index.html` es la landing page original de Restaurante.
- `panel/index.html` es idéntico al panel original.
- Se copiaron PWA, service worker, iconos, offline, documentación, configuración, pruebas y `panel/professional.js`.
- El `CNAME` propio se conserva como `pro.yummypro.online`.

Commits de sincronización completa:
- `0d813b1078528d56c5baa78895621160c1ae6dcb` — landing y archivos base.
- `84252eeaf7eab63a3ca8e0ceb5f502053e2c3e78` — panel, runtime y pruebas.
- `275019ea3aeeae96bbe7c7af5dee64b31d002b5c` — assets PWA.

Regla actual: desplegar/revisar primero esta copia completa y solo después ocultar o eliminar módulos según instrucción explícita.

## Punto de partida aprobado

Por instrucción del usuario, el panel de Profesionales debe comenzar como una copia completa del panel de Restaurante, sin eliminar ni rediseñar módulos en esta primera etapa.

Repositorio fuente:
- `jorge2610g/yummy-restaurante/panel/index.html`

Repositorio destino:
- `jorge2610g/yummy-profesionales`
- Dominio: `pro.yummypro.online`

## Base sincronizada

Se copiaron exactamente:
- `index.html` ← panel completo de Restaurante
- `panel/index.html`
- `panel/professional.js`
- `manifest.webmanifest`
- `pwa-icon.svg`
- `push-sw.js`
- `offline.html`
- `restaurant-offline.html`
- `apple-touch-icon.png`
- `icon-192.png`
- `icon-512.png`

El `CNAME` propio de Profesionales se conservó.

Commit base:
- `762ff17ef2429c464c881203f69861cfb2b64eea` — Sync full restaurant panel as baseline.

## Regla para continuar

No reconstruir el panel desde cero.

El próximo trabajo es abrir/revisar esta copia y comenzar a eliminar, módulo por módulo, únicamente lo que Profesionales no necesita. Todo lo común con Restaurante y Retail debe conservarse idéntico mientras no exista una instrucción explícita de cambiarlo.

## AUDITORÍA DE LIMPIEZA — 2026-09-24

Se comparó el árbol completo contra `jorge2610g/yummy-restaurante`.

Resultado final:
- 0 archivos de código extra.
- 0 archivos copiados con SHA distinto.
- 0 archivos faltantes de la copia original, excluyendo el `CNAME` que debe ser propio del dominio.
- `PROJECT_CONTEXT.md` se conserva solo como documentación de continuidad; no forma parte del runtime.

Regla: cualquier personalización futura debe partir de esta copia limpia y hacerse solo por instrucción explícita.

## SEPARACIÓN DE DOMINIO Y ACCESOS — 2026-09-24

Primer cambio posterior al clon completo.

- La landing ya no redirige a `web.yummypro.online`.
- Inicio de sesión exitoso → `https://pro.yummypro.online/panel/`.
- “Ir a mi panel” → `https://pro.yummypro.online/panel/`.
- Registro/creación de cuenta usa `emailRedirectTo: https://pro.yummypro.online/panel/`.
- Al terminar la creación de la prueba/cuenta → `https://pro.yummypro.online/panel/`.
- El panel vuelve a su propia landing `https://pro.yummypro.online/` en lugar de Restaurante.
- Recursos internos que apuntaban explícitamente a `web.yummypro.online` fueron apuntados al dominio propio.
- Se mantienen compartidos `menu.yummypro.online` y `admin.yummypro.online` donde corresponde.

No se modificaron todavía módulos, textos comerciales ni estructura visual; este cambio es únicamente de separación de dominio/acceso.

## PLANES POR VERTICAL EN LANDING — 2026-09-24

- Landing de Profesionales carga únicamente planes con `business_type = professional`.
- El registro desde esta landing queda fijado a Profesional / Servicios.
- Al elegir un plan se conserva el mismo tipo de negocio durante el alta.
- Commit: `fa13adc41749e9ae3eb9e8f234eed00e67d10102`.

## RESPALDOS Y CORRECCIÓN DE LANDING — 2026-09-24

- Respaldo original de Restaurante verificado: `backup-original-pre-retail-2026-09-23` → commit `2610571c77c40c7ef85ffd6238aef8ecfd038171`.
- Segundo respaldo independiente creado: `backup/original-restaurante-100pct-pre-retail-profesionales-2026-09-24`.
- Respaldo del estado actual de Profesionales antes de eliminar/ocultar módulos: `backup/pre-module-removal-2026-09-24`.
- Regla operativa: no eliminar módulos/archivos sin crear o verificar respaldo previo.
- Se corrigió la política pública de `platform_countries` en Supabase para que las landings puedan cargar países y planes sin ejecutar `is_site_admin()`.


## VALIDACIÓN DE RUTAS Y ALTAS POR VERTICAL — 2026-09-24

Respaldo previo:
- `backup/pre-routing-demo-validation-2026-09-24`

Estado validado:
- Landing v2.0.13.
- Panel Profesionales v2.5.53.
- Landing y panel aceptan únicamente `business_type = professional`.
- Login, “Ir a mi panel”, confirmación de correo y alta redirigen a `https://pro.yummypro.online/panel/`.
- “Instalar panel” usa `/panel/?install=pwa`, por lo que permanece en Profesionales.
- “Ver demostración” abre el demo público `barberia-demo-yummypro`.
- Una cuenta Restaurante o Retail es rechazada antes de abrir el panel.
- La prueba nueva queda `is_demo = true` y usa exclusivamente la prueba predeterminada `professional`.

