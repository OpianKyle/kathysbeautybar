import mysql, { type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import { logger } from "./logger";

const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;

if (!DB_HOST || !DB_NAME || !DB_USER || !DB_PASSWORD) {
  throw new Error(
    "Missing required MySQL environment variables: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD",
  );
}

export const pool = mysql.createPool({
  host: DB_HOST,
  port: DB_PORT ? Number(DB_PORT) : 3306,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "+00:00",
});

export async function testDbConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    logger.info("MySQL database connection successful");
  } finally {
    conn.release();
  }
}

export type { RowDataPacket, ResultSetHeader };

export interface DbService extends RowDataPacket {
  id: number;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  category: string;
  imageUrl: string | null;
  active: number;
}

export interface DbAppointment extends RowDataPacket {
  id: number;
  customerName: string;
  email: string;
  phone: string;
  serviceId: number;
  startTime: Date;
  endTime: Date;
  notes: string | null;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  createdAt: Date;
}

export interface DbAdminUser extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface DbBusinessSetting extends RowDataPacket {
  id: number;
  key: string;
  value: string;
}
