import { withTenant } from '../lib/tenant.js';

function requiredString(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function createClient(req, res, next) {
  try {
    const name = requiredString(req.body.name);
    const email = requiredString(req.body.email)?.toLowerCase();
    const company = requiredString(req.body.company);

    if (!name || !email || !company || name.length > 200 || company.length > 200 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'name, email, and company are required.' });
    }

    const client = await withTenant({ user: req.user }, (db) => db.client.create({
      data: {
        name,
        email,
        company,
        createdById: req.user.id
      }
    }));

    return res.status(201).json({ data: client });
  } catch (error) {
    return next(error);
  }
}
