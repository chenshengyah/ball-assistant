import { bootstrapAuth } from "./services/auth";

App({
  onLaunch(): void {
    void bootstrapAuth();
  },
});
