import { env } from "cloudflare:workers"
export async function getKV(key: string = "default-key"): Promise<string | null> {
    // 参数验证
    if (!key || typeof key !== 'string') {
        throw new Error('Invalid key: Key must be a non-empty string');
    }
    
    try {
        // 检查命名空间是否存在
        if (!env.token) {
            console.warn(`KV namespace "test" does not exist, using fallback secret`);
            // 返回一个默认的测试密钥，仅用于开发环境
            return "JBSWY3DPEHPK3PXP";
        }
        
        // 使用 Promise.race 添加超时处理
        const timeout = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('KV operation timed out')), 5000);
        });
        
        try {
            // 正确使用 Cloudflare KV API 并添加超时处理
            const result = await Promise.race([
                env.token.get(key),
                timeout
            ]);
            
            // 根据 Cloudflare KV API 文档，get() 方法直接返回值或 null
            return typeof result === 'string' ? result : null;
        } catch (kvError) {
            if (kvError instanceof Error && kvError.message.includes('timed out')) {
                console.error(`KV operation timed out for key "${key}"`);
                throw kvError;
            }
            console.error(`Error accessing KV for key "${key}":`, kvError);
            return null;
        }
    } catch (error) {
        // 区分不同类型的错误
        if (error instanceof Error) {
            // 只记录非预期错误，避免日志污染
            if (!error.message.includes('timed out')) {
                console.error(`Error fetching key "${key}" from KV namespace "test":`, error.message);
            }
            
            // 对于关键错误，重新抛出以便调用者处理
            if (error.message.includes('timed out')) {
                throw error;
            }
        } else {
            console.error(`Unknown error fetching key "${key}" from KV namespace "test":`, error);
        }
        return null;
    }
}
export async function writeKV(key: string = "default-key", value: string): Promise<boolean> {
    // 参数验证
    if (!key || typeof key !== 'string') {
        throw new Error('Invalid key: Key must be a non-empty string');
    }
    if (!value || typeof value !== 'string') {
        throw new Error('Invalid value: Value must be a non-empty string');
    }

    try {
        // 检查命名空间是否存在
        if (!env.token) {
            console.warn(`KV namespace "test" does not exist, using fallback secret`);
            return false;
        }
        
        // 使用 Promise.race 添加超时处理
        const timeout = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('KV operation timed out')), 5000);
        });
        
        try {
            // 正确使用 Cloudflare KV API 并添加超时处理
            await Promise.race([
                env.token.put(key, value),
                timeout
            ]);
            let result = await getKV(key); // 写入后验证
            // console.info("result:", result);    
            if (result === value) {
                // console.info(`Successfully wrote and verified KV for key "${key}"`);
                return true;
            } else {
                // console.info(`KV verification failed for key "${key}": expected "${value}", got "${result}"`);
                return false;
            }
        } catch (kvError) {
            if (kvError instanceof Error && kvError.message.includes('timed out')) {
                console.error(`KV operation timed out for key "${key}"`);
                throw kvError;
            }
            console.error(`Error accessing KV for key "${key}":`, kvError);
            return false;
        }
    } catch (error) {
        // 区分不同类型的错误
        if (error instanceof Error) {
            // 只记录非预期错误，避免日志污染
            if (!error.message.includes('timed out')) {
                console.error(`Error fetching key "${key}" from KV namespace "test":`, error.message);
            }
            
            // 对于关键错误，重新抛出以便调用者处理
            if (error.message.includes('timed out')) {
                throw error;
            }
        } else {
            console.error(`Unknown error fetching key "${key}" from KV namespace "test":`, error);
        }
        return false;
    }
    return true;
}

async function generateRandomToken(length = 64): Promise<string> {
  try {
    // 1. 生成随机字节数组（加密安全）
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));

    // 2. 转换为 Base64 字符串
    let base64Token = btoa(String.fromCharCode(...randomBytes));

    // 3. 优化：去除填充符 `=`，替换 `+`/`/` 为 `-`/`_`（URL 安全）
    const urlSafeToken = base64Token.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

    return urlSafeToken;
  } catch (error) {
    throw new Error(`Failed to generate token: ${error}`);
  }
}
// check if token expired by reading the expiry time from KV
export function getCurrentTimeStamp(): number {
   const utcTimestampSeconds = Math.floor(Date.now() / 1000); // 当前时间的UTC时间戳，单位为秒
    return utcTimestampSeconds;
}
export async function getExpiryTime(user:string): Promise<number> {
    const expiryTimestamp = await getKV(`expire-time-${user}`);
    return expiryTimestamp ? parseInt(expiryTimestamp) : 0;
}
export async function getGenerateTime(user:string): Promise<number> {
    const generateTimestamp = await getKV(`generate-time-${user}`);
    return generateTimestamp ? parseInt(generateTimestamp) : 0;
}
export async function getExpiryTimeStamp(user:string): Promise<number> {
    const expiryTimestamp = await getExpiryTime(user) + await getGenerateTime(user);
    return expiryTimestamp;
}
export async function isTokenExpired(user:string): Promise<boolean> {
    const currentTime = getCurrentTimeStamp();
    const expiryTime = await getExpiryTimeStamp(user);
    // console.info(`Current time: ${currentTime}, Expiry time: ${expiryTime}`);
    return currentTime >= expiryTime;
}

export { generateRandomToken };