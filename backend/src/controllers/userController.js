import prisma from '../lib/prisma.js';
import { hashPassword, validPassword, publicUser } from '../lib/security.js';

export async function listUsers(req, res, next) {
  try {
    res.json({ data: await prisma.user.findMany({ select: publicUser, orderBy: { name: 'asc' } }) });
  } catch (error) { next(error); }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const username = typeof req.body.username === 'string' ? req.body.username.trim() || null : null;
    if (typeof name !== 'string' || !name.trim() || name.length > 200 ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !validPassword(password) ||
      (req.body.username != null && typeof req.body.username !== 'string') || (username && !/^[A-Za-z0-9_]{3,32}$/.test(username))) {
      return res.status(400).json({ message: 'Introduce nombre, correo válido, contraseña de 12 a 128 caracteres y un usuario opcional de 3 a 32 letras, números o guiones bajos.' });
    }
    const user = await prisma.user.create({
      data: { name: name.trim(), email: email.trim().toLowerCase(), username, role: 'MEMBER', passwordHash: await hashPassword(password) },
      select: publicUser
    });
    res.status(201).json({ data: user });
  } catch (error) { next(error); }
}
