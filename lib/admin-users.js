import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cleanText, query } from "./db";

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = "scrypt";
const KEY_LENGTH = 64;
const MAX_AVATAR_BASE64_LENGTH = 700_000;

async function columnExists(columnName) {
  const rows = await query(
    `SELECT COUNT(*) total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'admin_usuarios'
        AND COLUMN_NAME = :columnName`,
    { columnName }
  );
  return Number(rows[0]?.total || 0) > 0;
}

export async function ensureAdminSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS admin_usuarios (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email VARCHAR(160) NOT NULL,
      nombre VARCHAR(160) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      avatar_mime VARCHAR(40) NULL,
      avatar_base64 MEDIUMTEXT NULL,
      rol ENUM('ADMIN', 'OPERADOR') NOT NULL DEFAULT 'ADMIN',
      activo TINYINT(1) NOT NULL DEFAULT 1,
      ultimo_acceso TIMESTAMP NULL,
      creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_admin_usuarios_email (email),
      KEY idx_admin_usuarios_activo (activo)
    ) ENGINE=InnoDB
  `);

  if (!(await columnExists("avatar_mime"))) {
    await query("ALTER TABLE admin_usuarios ADD COLUMN avatar_mime VARCHAR(40) NULL AFTER password_hash");
  }

  if (!(await columnExists("avatar_base64"))) {
    await query("ALTER TABLE admin_usuarios ADD COLUMN avatar_base64 MEDIUMTEXT NULL AFTER avatar_mime");
  }
}

export function normalizeEmail(value) {
  return cleanText(value, 160).toLowerCase();
}

export function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 8) return "La contraseña debe tener mínimo 8 caracteres.";
  if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value)) return "La contraseña debe incluir letras y números.";
  return null;
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  return `${HASH_PREFIX}$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [prefix, salt, hash] = String(storedHash || "").split("$");
  if (prefix !== HASH_PREFIX || !salt || !hash) return false;

  const derived = await scrypt(String(password), salt, KEY_LENGTH);
  const stored = Buffer.from(hash, "hex");
  if (derived.length !== stored.length) return false;

  return timingSafeEqual(derived, stored);
}

export async function countAdminUsers() {
  await ensureAdminSchema();
  const rows = await query("SELECT COUNT(*) total FROM admin_usuarios");
  return Number(rows[0]?.total || 0);
}

export async function listAdminUsers() {
  await ensureAdminSchema();
  return query(
    `SELECT id, email, nombre, rol, activo, avatar_mime avatarMime,
            CASE WHEN avatar_base64 IS NULL THEN 0 ELSE 1 END hasAvatar,
            DATE_FORMAT(ultimo_acceso, '%Y-%m-%d %H:%i:%s') ultimoAcceso,
            DATE_FORMAT(creado_en, '%Y-%m-%d %H:%i:%s') creadoEn
       FROM admin_usuarios
      ORDER BY creado_en DESC`
  );
}

export function parseAvatarDataUrl(dataUrl) {
  const value = String(dataUrl || "");
  const match = value.match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;

  const mimeType = match[1] === "image/jpg" ? "image/jpeg" : match[1];
  const base64 = match[2];

  if (base64.length > MAX_AVATAR_BASE64_LENGTH) {
    throw new Error("La imagen de perfil supera el tamaño permitido.");
  }

  return { mimeType, base64 };
}

export async function createAdminUser(input) {
  await ensureAdminSchema();

  const email = normalizeEmail(input.email);
  const nombre = cleanText(input.nombre, 160).toUpperCase();
  const rol = String(input.rol || "").toUpperCase();
  const passwordError = validatePassword(input.password);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingrese un correo válido.");
  if (!nombre) throw new Error("Ingrese el nombre del usuario.");
  if (!["ADMIN", "OPERADOR"].includes(rol)) throw new Error("Seleccione un rol válido.");
  if (passwordError) throw new Error(passwordError);

  const passwordHash = await hashPassword(input.password);
  await query(
    `INSERT INTO admin_usuarios (email, nombre, password_hash, rol, activo)
     VALUES (:email, :nombre, :passwordHash, :rol, 1)`,
    { email, nombre, passwordHash, rol }
  );

  return { email, nombre, rol };
}

export async function findAdminUserByEmail(email) {
  await ensureAdminSchema();
  const rows = await query(
    `SELECT id, email, nombre, password_hash passwordHash, rol, activo
       FROM admin_usuarios
      WHERE email = :email
      LIMIT 1`,
    { email: normalizeEmail(email) }
  );
  return rows[0] || null;
}

export async function findAdminUserById(id) {
  await ensureAdminSchema();
  const rows = await query(
    `SELECT id, email, nombre, password_hash passwordHash, rol, activo,
            avatar_mime avatarMime, avatar_base64 avatarBase64
       FROM admin_usuarios
      WHERE id = :id
      LIMIT 1`,
    { id }
  );
  return rows[0] || null;
}

export async function updateAdminProfile(id, input) {
  await ensureAdminSchema();

  const email = normalizeEmail(input.email);
  const nombre = cleanText(input.nombre, 160).toUpperCase();
  const avatar = input.removeAvatar ? null : parseAvatarDataUrl(input.avatarDataUrl);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingrese un correo válido.");
  if (!nombre) throw new Error("Ingrese el nombre del usuario.");

  await query(
    `UPDATE admin_usuarios
        SET email = :email,
            nombre = :nombre,
            avatar_mime = CASE WHEN :removeAvatar = 1 THEN NULL WHEN :avatarMime IS NULL THEN avatar_mime ELSE :avatarMime END,
            avatar_base64 = CASE WHEN :removeAvatar = 1 THEN NULL WHEN :avatarBase64 IS NULL THEN avatar_base64 ELSE :avatarBase64 END
      WHERE id = :id
      LIMIT 1`,
    {
      id,
      email,
      nombre,
      removeAvatar: input.removeAvatar ? 1 : 0,
      avatarMime: avatar?.mimeType || null,
      avatarBase64: avatar?.base64 || null
    }
  );
}

export async function updateAdminPassword(id, passwordHash) {
  await query("UPDATE admin_usuarios SET password_hash = :passwordHash WHERE id = :id LIMIT 1", { id, passwordHash });
}

export async function touchAdminAccess(id) {
  await query("UPDATE admin_usuarios SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = :id LIMIT 1", { id });
}
