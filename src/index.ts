import { Hono } from "hono";
import { generateRandomToken, getKV, writeKV } from "./utils";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post("/token/generate", async (c) => {
  let token = await generateRandomToken(64)
  let result = await writeKV("token-1", token);
  if (!result) {
    return c.text("Failed to write token to KV", 500);
  } else {
    return c.text("Token generated: " + token);
  }
});
app.post("/token/verify", async (c) => {
  let body = await c.req.json();
  console.info("Request body:", body);
  let  token  = body["token"];
  let storedToken = await getKV("token-1");
  console.log("Stored token:", storedToken);
  console.log("Provided token:", token);
  if (token === storedToken) {
    return c.json({ isValid: true });
  } else {
    return c.json({ isValid: false }, 401);
  }
  
});
app.post("/token/get", async (c) => {
  let result = await getKV("token-1");
  console.info("Retrieved token:", result);
  if (!result) {
    return c.json("Failed to retrieve token", 500);
  } else {
    return c.json({ token: result });
  }
});

export default app;
