import type { FastifyReply, FastifyRequest } from "fastify";

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    await request.jwtVerify();

    // Le JWT identifie la session, mais les droits d'accès et l'établissement
    // doivent rester synchronisés avec la base de données. Cela évite qu'un
    // ancien access token conserve un role/schoolId obsolète.
    const user = await request.server.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        role: true,
        schoolId: true,
      },
    });

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
  } catch {
    return reply.status(401).send({
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required.",
      },
    });
  }
}