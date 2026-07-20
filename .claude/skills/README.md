# Skills de diseño instaladas en este proyecto

Tres paquetes de *skills* de Claude Code, vendorizados tal cual en este repo (`.claude/skills/`) para que se carguen automáticamente al trabajar en `decogas`, sin instalación aparte. Todas son de terceros, con licencia permisiva; se mantiene su LICENSE original dentro de cada carpeta.

## 1. Emil Kowalski — diseño de interacción y animación
Fuente: [github.com/emilkowalski/skills](https://github.com/emilkowalski/skills) · MIT · © Emil Kowalski

Seis skills: `emil-design-eng` (la principal — filosofía de pulido de UI y componentes), `animation-vocabulary`, `apple-design`, `find-animation-opportunities`, `improve-animations`, `review-animations`. Se activan solas cuando la tarea implica animaciones, micro-interacciones o pulido de componentes.

## 2. Impeccable — anti "cara de IA" en frontends
Fuente: [github.com/pbakaus/impeccable](https://github.com/pbakaus/impeccable) · Apache 2.0 · © Paul Bakaus

Skill única `impeccable` con 23 comandos (`craft`, `critique`, `audit`, `polish`, `bolder`, `colorize`, `animate`, `live`...). Invocable como `/impeccable <comando> [objetivo]`. La primera vez que se use en el proyecto puede pedir generar `PRODUCT.md`/`DESIGN.md` (contexto de marca/producto) — normal, es su forma de calibrarse a Decogas.

## 3. Taste Skill — anti-genérico para landing pages
Fuente: [github.com/Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) · MIT · © Leon Lin

Skill `design-taste-frontend`: lee el brief, infiere variance/motion/densidad, y evita los clichés típicos de IA (tarjetas idénticas, degradados de texto, hero centrado con stats falsas).

## Cómo se usan aquí

Se activan automáticamente cuando la tarea encaja (retocar CSS, animaciones, layout, crítica de diseño). También se pueden invocar a mano: `/impeccable audit web/src/pages/index.astro`, o simplemente pedir "usa el skill de Emil Kowalski para..." / "aplica taste-skill a...".

Instaladas el 20/07/2026 a petición del usuario.
