import { handleConsole } from "./console";
import { handleCron } from "./runtime";

export default {
	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		await handleCron(env, controller.cron, {}, controller.scheduledTime);
	},

	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		if (new URL(request.url).pathname === "/healthz") {
			return Response.json({ ok: true });
		}
		return handleConsole(request, env, ctx);
	},
} satisfies ExportedHandler<Env>;
