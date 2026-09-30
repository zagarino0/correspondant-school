import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
  }

  // Le JWT identifie la session, mais le role et l'établissement actifs
  // doivent rester synchronisés avec la base de données. Cela évite qu'un
  // ancien access token conserve un contexte d'autorisation obsolète.
  let user: {
    id: string;
    role: string;
    schoolId: string | null;
  } | null;

  try {
    user = await request.server.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        role: true,
        schoolId: true,
      },
    });
  } catch (error) {
    request.log.error(
      { userId: request.user.sub, err: error },
      "Authentication context lookup failed",
    );

    return reply.status(503).send({
      error: {
        code: "AUTH_CONTEXT_UNAVAILABLE",
        message: "Authentication context is temporarily unavailable.",
      },
    });
  }

  if (!user) {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "User account not found.",
      },
    });
  }

  request.user = {
    ...request.user,
    sub: user.id,
    role: user.role,
    schoolId: user.schoolId,
  };
}
