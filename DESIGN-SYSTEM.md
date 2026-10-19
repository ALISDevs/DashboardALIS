# ALIS · Dashboard V14

Sistema visual aplicado a TicketsALIS y DashboardALIS según las directrices del rediseño: fondo negro, superficies glass, naranja/coral y navegación en pastillas claras. Las métricas utilizan exclusivamente los datos recibidos por cada vista.

## Componentes espejo

Cada frontend conserva su propia copia de `src/shared/ui/GlassCard.jsx`, `StatsCard.jsx`, `Brand.jsx`, `Topbar.jsx` y `src/shared/styles/theme.css`. No depende de archivos externos al repositorio para compilar o desplegar. Al cambiar el sistema compartido, mantener ambas copias sincronizadas.

GlassCard utiliza `motion.div` y las clases `glass-card p-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md`. Su hover eleva la tarjeta exactamente 5 píxeles y admite `hover={false}` para editores y superficies que deben permanecer estables. StatsCard presenta un valor real, icono Lucide y contexto breve.

## Identidad

| Elemento | Valor |
| --- | --- |
| Fondo | `#0a0a0a` |
| Superficie | Blanco con opacidad entre 3 % y 5 % |
| Bordes | Blanco con opacidad aproximada de 9 % |
| Acción primaria | `#ff8853` |
| Gradiente | `#ff8a45` → `#ff663b` → `#ed4d59` |
| Tipografía | Manrope Variable, alojada localmente mediante Fontsource |
| Tab activo | Fondo claro, texto oscuro, radio de pastilla |
| Finalizado | Verde suave, acompañado de icono y texto |
| Prioridad alta y eliminación | Rojo suave, acompañado de texto |

Los estilos base y tokens están en theme.css; cada styles.css contiene los layouts y estados propios del portal. Tailwind se procesa con el plugin oficial para Vite. [Instalación de Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite).

## Layout e interacción

TicketsALIS incluye resumen Bento, proyectos, Kanban con búsqueda y filtro por proyecto, navegación por rol y documentación. El portal del cliente presenta una tarjeta destacada de progreso, métricas, filtros de hitos y comentarios animados. Las pestañas del cliente muestran vista general, hitos y comentarios.

En pantallas pequeñas, los resúmenes pasan a dos columnas, la tarjeta principal ocupa el ancho completo y el Kanban se reorganiza verticalmente. La navegación puede desplazarse horizontalmente. Los campos y textos mantienen estados de foco visibles y las acciones conservan etiquetas junto a sus iconos.

MotionConfig y useReducedMotion respetan la preferencia de movimiento reducido; las reglas CSS también desactivan transiciones y giros cuando corresponde. [Accesibilidad de Motion](https://motion.dev/docs/react-accessibility).

Los controles de sesiones, permisos y aceptación de términos permanecen en sus flujos actuales. El modal de términos conserva el bloqueo previo, la casilla explícita y la captura de foco. No se registraron aceptaciones en nombre de clientes para revisar el diseño.

## Desarrollo local

En cada frontend: `npm run dev`. Vite fija TicketsALIS en 5173 y DashboardALIS en 5174, sin cambiar a otro puerto si está ocupado. `npm run build` crea la distribución de producción y `npm run preview` permite revisarla.

Los scripts usan `--configLoader native` para evitar que el empaquetado de la configuración recorra directorios superiores restringidos. El resolutor `vite.dependencies.js` aplica la resolución local de Node al preempaquetado de dependencias, evitando el mismo problema de permisos del entorno durante desarrollo.

Verificado: compilación de ambos frontends, renderizado de componentes, CSS Tailwind servido en ambos puertos y npm audit sin avisos al finalizar. La revisión visual de navegador no estuvo disponible en esta sesión.
