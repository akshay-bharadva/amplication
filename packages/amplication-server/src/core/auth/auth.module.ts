import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AccountModule } from "../account/account.module";
import { PrismaModule } from "../../prisma/prisma.module";
import { UserModule } from "../user/user.module";
import { WorkspaceModule } from "../workspace/workspace.module";
import { PermissionsModule } from "../permissions/permissions.module";
import { ExceptionFiltersModule } from "../../filters/exceptionFilters.module";
import { GqlAuthGuard } from "../../guards/gql-auth.guard";
import { AuthService } from "./auth.service";
import { AuthResolver } from "./auth.resolver";
import {
  AUTH_AFTER_CALLBACK_PATH,
  AUTH_CALLBACK_PATH,
  AUTH_LOGIN_PATH,
  AUTH_LOGOUT_PATH,
  AuthController,
} from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { GitHubStrategy } from "./github.strategy";
import { GoogleSecretsManagerModule } from "../../services/googleSecretsManager.module";
import { GitHubStrategyConfigService } from "./githubStrategyConfig.service";
import { GoogleSecretsManagerService } from "../../services/googleSecretsManager.service";
import { ProjectModule } from "../project/project.module";
import { GitHubAuthGuard } from "./github.guard";
import { Auth0Middleware } from "./auth0.middleware";
import { KafkaModule } from "@amplication/util/nestjs/kafka";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
      }),
      inject: [ConfigService],
    }),
    AccountModule,
    PrismaModule,
    KafkaModule,
    PermissionsModule,
    ExceptionFiltersModule,
    WorkspaceModule,
    UserModule,
    GoogleSecretsManagerModule,
    ProjectModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GitHubAuthGuard,
    {
      provide: "GitHubStrategy",
      useFactory: async (
        authService: AuthService,
        configService: ConfigService,
        googleSecretsManagerService: GoogleSecretsManagerService
      ) => {
        const githubConfigService = new GitHubStrategyConfigService(
          configService,
          googleSecretsManagerService
        );
        const options = await githubConfigService.getOptions();

        if (options === null) {
          return;
        }

        return new GitHubStrategy(authService, options);
      },
      inject: [AuthService, ConfigService, GoogleSecretsManagerService],
    },
    GqlAuthGuard,
    AuthResolver,
    GitHubStrategyConfigService,
    Auth0Middleware,
  ],
  controllers: [AuthController],
  exports: [GqlAuthGuard, AuthService, AuthResolver],
})
// export class AuthModule {}
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(Auth0Middleware)
      .forRoutes(
        AUTH_LOGIN_PATH,
        AUTH_LOGOUT_PATH,
        AUTH_CALLBACK_PATH,
        AUTH_AFTER_CALLBACK_PATH
      );
  }
}
