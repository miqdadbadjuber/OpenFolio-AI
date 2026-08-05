import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./app";

const PORT = Number(process.env.PORT || 3001);

async function main() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OpenFolio dev server: http://localhost:${PORT}`);
  });
}
main();
