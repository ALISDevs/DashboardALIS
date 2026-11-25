# ALIS · Landing page

Primera versión de la landing comercial de ALIS. Proyecto estático independiente, con HTML, CSS y JavaScript. No requiere instalar dependencias ni modificar los otros proyectos del repositorio.

## Ver la página

Puedes abrir `index.html` directamente en el navegador. Para desarrollo con un servidor local, desde esta carpeta:

```powershell
npm run dev
```

La dirección local es **http://127.0.0.1:5180**. El puerto es diferente de los frontends TicketsALIS y DashboardALIS. Para usar otro puerto, configura la variable `PORT` antes de ejecutar el comando.

## Preparar archivos para hosting

```powershell
npm run build
```

El comando genera `dist/` con los archivos que se pueden subir a cualquier hosting estático. No se publica automáticamente.

Para revisar esa distribución:

```powershell
npm run preview
```

## Qué incluye

- Presentación, servicios y llamadas a la acción.
- Tres demostraciones interactivas: citas, pedidos y seguimiento de clientes.
- Proceso de trabajo y preguntas frecuentes.
- Formulario que prepara la consulta y abre WhatsApp. El usuario decide cuándo enviarla; la web no muestra una confirmación falsa de envío.
- Enlaces directos de WhatsApp y correo.
- Navegación móvil, accesibilidad de teclado y compatibilidad con movimiento reducido.
- Geist Sans y Geist Mono alojadas localmente, favicon y metadatos básicos para buscadores y enlaces compartidos.

Las cifras y registros de las demostraciones son ficticios y están identificados como ejemplos. Los cambios de las demos viven en memoria y se restablecen al recargar.

La sección de proyectos incluye una copia navegable de Bitácora Orbital en `proyectos/bitacora-orbital/` y una ficha de Indicadores y Registros con acceso al formulario para solicitar una demo.

## Contactos de ALIS

- WhatsApp: **+52 479 378 2222**.
- Correo: **alisdevs995@gmail.com**.

El número, correo y saludo se configuran en `config.js`. Los contactos iniciales y la alternativa sin JavaScript están también en `index.html`; si los cambias, actualiza ambos archivos. No hay backend, persistencia de formularios, cookies de seguimiento ni servicios de analítica en esta versión.

## Archivos

| Archivo | Propósito |
|---|---|
| `index.html` | Estructura, textos, formulario y enlaces |
| `styles.css` | Diseño responsive y estilos |
| `app.js` | Menú móvil, demos y preparación de la consulta |
| `config.js` | WhatsApp, correo y saludo inicial |
| `assets/` | Tipografía local, licencia y favicon |
| `scripts/serve.mjs` | Servidor local sin dependencias |
| `scripts/build.mjs` | Generación de la distribución estática |

La interfaz toma los colores oscuros de la portada de Vercel y conserva el símbolo de capas de ALIS en monocromo. Las fuentes y referencias se documentan en `DESIGN.md`.
