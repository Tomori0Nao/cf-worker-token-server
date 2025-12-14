import { Hono } from "hono";
import { generateRandomToken, getCurrentTimeStamp, getKV, isTokenExpired, writeKV } from "./utils";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.post("/token/:user/generate", async (c) => {
  let token = await generateRandomToken(64)
  let user = c.req.param("user");
  let result = await writeKV(`token-${user}`, token);
  let currentTimeStamp = getCurrentTimeStamp();
  // console.log("Current Time:", currentTimeStamp);
  // console.log("New Token:", token);
  await writeKV(`generate-time-${user}`, currentTimeStamp.toString());
  if (!result) {
    return c.json("Failed to write token", 500);
  } else {
    return c.json({ token: token });
  }
});

app.post("/token/:user/verify", async (c) => {
  let user = c.req.param("user");
  if (await isTokenExpired()) {
    let token = await generateRandomToken(64)
    let currentTime = getCurrentTimeStamp();
    // console.log("Current Time:", currentTime);
    // console.log("New Token:", token);
    await writeKV(`generate-time-${user}`, currentTime.toString());
    await writeKV(`token-${user}`, token);
    return c.json({ isValid: false, reason: "Token expired" }, 401);
  } else {
    let body = await c.req.json();
    // console.info("Request body:", body);
    let token = body["token"];
    let storedToken = await getKV(`token-${user}`);
    // console.log("Stored token:", storedToken);
    // console.log("Provided token:", token);
    if (token === storedToken) {
      return c.json({ isValid: true });
    } else {
      return c.json({ isValid: false }, 401);
    }
  }
});
app.post("/token/:user/get", async (c) => {
  let user = c.req.param("user");
  let result = await getKV(`token-${user}`);
  // console.info("Retrieved token:", result);
  if (!result) {
    return c.json("Failed to retrieve token", 500);
  } else {
    return c.json({ token: result });
  }
});

export default app;
