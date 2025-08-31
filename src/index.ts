import { Hono } from "hono";
import { generateRandomToken, getKV, writeKV } from "./utils";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post("/token/generate", async (c) => {
  let token = await generateRandomToken(64)
  writeKV("token-1", token);
  return c.text("Token generated: " + token);
});
app.post("/token/verify", async (c) => {
  let body = await c.req.json();
  console.info("Request body:", body);
  let  token  = body["token"];
  let storedToken = await getKV("token-1");
  console.log("Stored token:", storedToken);
  console.log("Provided token:", token);
  if (token === storedToken) {
    return c.json({ valid: true });
  } else {
    return c.json({ valid: false }, 401);
  }
  
});
export default app;
