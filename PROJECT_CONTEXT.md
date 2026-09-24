# Yummy Profesionales — Contexto y continuidad

Última actualización: 2026-09-24 (America/Santiago)

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
