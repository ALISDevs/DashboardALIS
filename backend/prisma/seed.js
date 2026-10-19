import 'dotenv/config';
import prisma from './adminDatabase.js';
import { ensureDemoAccounts } from './demoAccounts.js';

const projectName = 'Portal de operaciones ALIS';
const commentBody = 'El avance del panel cumple con los hitos acordados. Podemos continuar con la siguiente entrega.';

const tickets = [
  {
    title: 'Definir arquitectura de integraciones',
    description: 'Documentar los contratos entre el portal de clientes y la API.',
    category: 'Arquitectura',
    priority: 'HIGH',
    status: 'NEW',
    isVisibleToClient: false,
    assigneeEmail: 'nestor@alis.dev'
  },
  {
    title: 'Integrar autenticación del portal',
    description: 'Preparar el acceso seguro para usuarios del cliente.',
    category: 'Seguridad',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    isVisibleToClient: true,
    assigneeEmail: 'ana@alis.dev'
  },
  {
    title: 'Publicar panel de avances',
    description: 'Exponer el resumen de progreso y los hitos completados.',
    category: 'Dashboard',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    isVisibleToClient: true,
    assigneeEmail: 'nestor@alis.dev'
  },
  {
    title: 'Optimizar carga de reportes',
    description: 'Reducir el tiempo de respuesta para reportes internos.',
    category: 'Rendimiento',
    priority: 'LOW',
    status: 'NEW',
    isVisibleToClient: false,
    assigneeEmail: 'ana@alis.dev'
  },
  {
    title: 'Validar flujo de comentarios',
    description: 'Verificar el feedback del cliente sobre los hitos publicados.',
    category: 'Experiencia de cliente',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    isVisibleToClient: true,
    assigneeEmail: 'ana@alis.dev'
  }
];

async function upsertProject(clientId) {
  const existingProject = await prisma.project.findFirst({
    where: {
      clientId,
      name: projectName
    }
  });

  const projectData = {
    name: projectName,
    description: 'Portal de seguimiento para el cliente Empresa Demo.',
    status: 'ACTIVE',
    clientId
  };

  if (existingProject) {
    return prisma.project.update({
      where: {
        id: existingProject.id
      },
      data: projectData
    });
  }

  return prisma.project.create({
    data: projectData
  });
}

async function upsertTicket(ticket, projectId, usersByEmail) {
  const existingTicket = await prisma.ticket.findFirst({
    where: {
      projectId,
      title: ticket.title
    }
  });

  const ticketData = {
    title: ticket.title,
    description: ticket.description,
    category: ticket.category,
    priority: ticket.priority,
    status: ticket.status,
    isVisibleToClient: ticket.isVisibleToClient,
    projectId,
    assignedUserId: usersByEmail.get(ticket.assigneeEmail).id
  };

  if (existingTicket) {
    return prisma.ticket.update({
      where: {
        id: existingTicket.id
      },
      data: ticketData
    });
  }

  return prisma.ticket.create({
    data: ticketData
  });
}

async function seed() {
  await ensureDemoAccounts();
  const nestor = await prisma.user.upsert({
    where: {
      email: 'nestor@alis.dev'
    },
    update: {
      name: 'Néstor',
      role: 'ADMIN'
    },
    create: {
      name: 'Néstor',
      email: 'nestor@alis.dev',
      role: 'ADMIN'
    }
  });

  const ana = await prisma.user.upsert({
    where: {
      email: 'ana@alis.dev'
    },
    update: {
      name: 'Ana Morales',
      role: 'MEMBER'
    },
    create: {
      name: 'Ana Morales',
      email: 'ana@alis.dev',
      role: 'MEMBER'
    }
  });

  const client = await prisma.client.upsert({
    where: {
      email: 'contacto@empresademo.mx'
    },
    update: {
      name: 'Laura Méndez',
      company: 'Empresa Demo'
    },
    create: {
      name: 'Laura Méndez',
      email: 'contacto@empresademo.mx',
      company: 'Empresa Demo'
    }
  });

  const project = await upsertProject(client.id);
  await prisma.project.update({ where: { id: project.id }, data: { createdById: nestor.id } });
  await prisma.projectMember.createMany({ data: [nestor, ana].map((user) => ({ projectId: project.id, userId: user.id })), skipDuplicates: true });
  const usersByEmail = new Map([
    [nestor.email, nestor],
    [ana.email, ana]
  ]);

  const seededTickets = [];

  for (const ticket of tickets) {
    seededTickets.push(await upsertTicket(ticket, project.id, usersByEmail));
  }

  const visibleTicket = seededTickets.find((ticket) => ticket.title === 'Publicar panel de avances');

  await prisma.comment.deleteMany({
    where: {
      ticketId: visibleTicket.id,
      body: commentBody
    }
  });

  await prisma.comment.create({
    data: {
      body: commentBody,
      isMilestoneFeedback: true,
      ticketId: visibleTicket.id,
      clientId: client.id
    }
  });

  console.log('ALIS demo data seeded.');
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
