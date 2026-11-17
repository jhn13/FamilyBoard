import { ensureSchema, json, getMeta } from "./db.js";
import { deviceFor, handleGate, hasPin } from "./auth.js";
import { state, handleDo, BUILD } from "./api.js";
import { handleCalendar } from "./calendar.js";
import { handlePhotos } from "./photos.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!path.startsWith("/api/")) return env.ASSETS.fetch(request);

    try {
      await ensureSchema(env.DB);
      if (path === "/api/setup" || path === "/api/pair") return await handleGate(request, env, path);

      const device = await deviceFor(request, env.DB);
      if (path === "/api/hello") {
        return json({ build: BUILD, setUp: await hasPin(env.DB), paired: !!device, pinLength: +(await getMeta(env.DB, "pin_len")) || null });
      }
      // Everything else is family-only: this phone or iPad must have been connected with the PIN once.
      if (!device) return json({ error: "This device isn't connected yet.", paired: false }, 401);

      if (path === "/api/state") return json(await state(env));
      if (path === "/api/do") return await handleDo(request, env);
      if (path === "/api/calendar") return await handleCalendar(request, env, ctx);
      if (path === "/api/photos") return await handlePhotos(request, env, ctx);
      return json({ error: "Not found" }, 404);
    } catch (e) {
      console.error(e);
      return json({ error: "Something went wrong on the server. Try again in a moment." }, 500);
    }
  },
};
