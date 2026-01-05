import { Pool } from "pg";
import https from "https";

function getRemoteCert(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      })
      .on("error", reject);
  });
}

declare global {
  var __pgPool__: Pool | undefined;
}
const sslConfig =
  process.env.NODE_ENV === "production"
    ? {
        rejectUnauthorized: true,
        ca: await getRemoteCert(
          "https://dancey-main.s3.ap-southeast-2.amazonaws.com/certificates/rds-ap-southeast-2-bundle-certifcate-authority.pem",
        ),
      }
    : {
        rejectUnauthorized: false,
      };

const pool =
  global.__pgPool__ ??
  new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    application_name: `dancy-web-portal-${process.env.NODE_ENV || "development"}`,
    ssl: sslConfig,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== "production") global.__pgPool__ = pool;

export default pool;
