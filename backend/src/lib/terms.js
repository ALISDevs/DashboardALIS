import { createHash } from 'node:crypto';

export const termsVersion = '2026-10-18.1';
export const termsContent = `# Condiciones de acceso y privacidad

## Uso del portal
El portal permite consultar los hitos publicados de tu proyecto y enviar comentarios al equipo ALIS. Utiliza el acceso únicamente para el seguimiento del servicio acordado.

## Confidencialidad
El enlace de acceso es personal para el contacto autorizado del cliente. Conserva la confidencialidad del enlace y de la información del proyecto. Comparte el acceso únicamente con personas autorizadas por tu organización y por ALIS.

## Datos y finalidad
Se utilizan los datos de contacto facilitados por el cliente, el progreso publicado y los comentarios enviados para gestionar y dar seguimiento al proyecto. Evita incluir contraseñas, secretos técnicos o datos personales innecesarios en los comentarios.

## Registro de aceptación
Al aceptar se registra la fecha, la versión y la huella del texto mostrado, asociados al cliente y al proyecto de acceso. Si tienes dudas sobre el tratamiento de tus datos o deseas ejercer una solicitud de privacidad, contacta al responsable de tu proyecto en ALIS.

## Alcance
Estas condiciones regulan el acceso al portal y complementan los acuerdos de servicio y confidencialidad formalizados con ALIS. No sustituyen esos acuerdos.`;

export const termsHash = createHash('sha256').update(termsContent).digest('hex');
export const termsNotice = { version: termsVersion, content: termsContent, hash: termsHash };
export function hasAcceptedTerms(client) {
  return client.termsAccepted && client.termsVersion === termsVersion;
}
