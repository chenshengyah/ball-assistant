import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedUser } from "./types";

type JwtPayload = {
  sub: string;
  openId: string;
};

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: AuthenticatedUser;
    }>();
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        authorization.replace("Bearer ", "").trim()
      );

      request.user = {
        userId: payload.sub,
        openId: payload.openId
      };
    } catch {
      request.user = undefined;
    }

    return true;
  }
}
