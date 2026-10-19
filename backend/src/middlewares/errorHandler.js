export function errorHandler(error, req, res, next) {
  console.error(error.code || error.name);
  if ([400, 403, 404, 409].includes(error.status)) return res.status(error.status).json({ message: error.message });

  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'El cuerpo de la petición no es JSON válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ message: 'El contenido excede el tamaño permitido.' });
  }

  if (error.code === 'P2003') {
    return res.status(400).json({ message: 'El proyecto, responsable o cliente seleccionado no existe.' });
  }

  if (error.code === 'P2025') {
    return res.status(404).json({ message: 'El registro solicitado no existe.' });
  }

  if (error.code === 'P2002') {
    return res.status(409).json({ message: 'Ya existe un registro con ese correo o identificador.' });
  }

  res.status(500).json({ message: 'Internal server error' });
}
