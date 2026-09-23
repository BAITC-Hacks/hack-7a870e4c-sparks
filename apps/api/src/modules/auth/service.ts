import { createHash, createHmac, randomBytes } from "node:crypto";
import type { Store } from "../../utils/db";
import type { AppConfig } from "../../utils/config";
import { validateCredentials } from "../../utils/config";
import type { SessionUser } from "../../contracts";
import { HttpError } from "../../utils/http";

export const SESSION_COOKIE = "career_quest_session";
const SESSION_SECONDS = 12 * 60 * 60;
const tokenHash = (token: string) =>
	createHash("sha256").update(token).digest("hex");

export function employeePassword(secret: string, employeeId: string) {
	return createHmac("sha256", secret)
		.update(`career-quest:${employeeId}`)
		.digest("base64url")
		.slice(0, 28);
}

export class AuthService {
	private attempts = new Map<string, { count: number; until: number }>();
	private dummyHash = Bun.password.hash(
		"invalid-account-" + randomBytes(24).toString("hex"),
		{ algorithm: "argon2id", memoryCost: 8192, timeCost: 2 },
	);
	constructor(
		private store: Store,
		private config: AppConfig,
	) {}

	async bootstrap() {
		validateCredentials(this.config);
		const data = await this.store.readDataset();
		const existing = new Set(
			(
				await this.store.prisma.account.findMany({ select: { username: true } })
			).map((a) => a.username),
		);
		const pending: {
			username: string;
			role: "hr" | "employee";
			employeeId: string | null;
			password: string;
		}[] = [];
		if (!existing.has("hr"))
			pending.push({
				username: "hr",
				role: "hr",
				employeeId: null,
				password: this.config.hrPassword,
			});
		for (const employee of data.employees) {
			if (employee.employee_id === "hr")
				throw new Error("ID hr зарезервирован для аккаунта HR.");
			if (!existing.has(employee.employee_id))
				pending.push({
					username: employee.employee_id,
					role: "employee",
					employeeId: employee.employee_id,
					password:
						employee.employee_id === this.config.demoEmployeeId &&
						this.config.demoEmployeePassword
							? this.config.demoEmployeePassword
							: employeePassword(
									this.config.credentialSecret,
									employee.employee_id,
								),
				});
		}
		// Limit password-hash concurrency and memory consumption on small demo hosts.
		for (let i = 0; i < pending.length; i += 4) {
			const accounts = await Promise.all(
				pending.slice(i, i + 4).map(async ({ password, ...account }) => ({
					...account,
					passwordHash: await Bun.password.hash(password, {
						algorithm: "argon2id",
						memoryCost: 8192,
						timeCost: 2,
					}),
				})),
			);
			await this.store.write(async (tx) => {
				for (const account of accounts)
					await tx.account.upsert({
						where: { username: account.username },
						create: account,
						update: {},
					});
			});
		}
		await this.store.write((tx) =>
			tx.session.deleteMany({ where: { expiresAt: { lte: new Date() } } }),
		);
	}

	private async user(username: string): Promise<SessionUser> {
		const account = await this.store.prisma.account.findUnique({
			where: { username },
		});
		if (!account || (account.role !== "hr" && account.role !== "employee"))
			throw new HttpError(401, "Сессия недействительна.");
		const employee = account.employeeId
			? await this.store.prisma.employee.findUnique({
					where: { id: account.employeeId },
				})
			: null;
		if (account.role === "employee" && !employee)
			throw new HttpError(401, "Профиль сотрудника отсутствует.");
		return {
			username: account.username,
			role: account.role,
			employee_id: account.employeeId,
			full_name:
				account.role === "hr"
					? "HR"
					: (employee!.payload as { full_name: string }).full_name,
		};
	}

	async login(username: string, password: string) {
		const now = Date.now();
		if (this.attempts.size > 5000)
			for (const [key, value] of this.attempts)
				if (value.until <= now) this.attempts.delete(key);
		const attempt = this.attempts.get(username);
		if (attempt && attempt.until > now && attempt.count >= 10)
			throw new HttpError(
				429,
				"Слишком много попыток входа. Повторите через 15 минут.",
			);
		if (this.attempts.size >= 10000 && !attempt)
			throw new HttpError(429, "Слишком много попыток входа. Повторите позже.");
		this.attempts.set(username, {
			count: attempt && attempt.until > now ? attempt.count + 1 : 1,
			until: attempt && attempt.until > now ? attempt.until : now + 15 * 60_000,
		});
		const account = await this.store.prisma.account.findUnique({
			where: { username },
		});
		const valid = await Bun.password.verify(
			password,
			account?.passwordHash || (await this.dummyHash),
		);
		if (!valid || !account)
			throw new HttpError(401, "Неверный логин или пароль.");
		this.attempts.delete(username);
		const token = randomBytes(32).toString("base64url");
		await this.store.write(async (tx) => {
			await tx.session.deleteMany({
				where: { expiresAt: { lte: new Date() } },
			});
			await tx.session.create({
				data: {
					tokenHash: tokenHash(token),
					username,
					expiresAt: new Date(now + SESSION_SECONDS * 1000),
				},
			});
		});
		return { token, user: await this.user(username) };
	}

	token(request: Request): string | null {
		const entry = request.headers
			.get("cookie")
			?.split(";")
			.map((x) => x.trim())
			.find((x) => x.startsWith(`${SESSION_COOKIE}=`));
		const value = entry?.slice(SESSION_COOKIE.length + 1);
		return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
	}

	async session(request: Request): Promise<SessionUser> {
		const token = this.token(request);
		if (!token) throw new HttpError(401, "Требуется вход в аккаунт.");
		const session = await this.store.prisma.session.findUnique({
			where: { tokenHash: tokenHash(token) },
		});
		if (!session || session.expiresAt.getTime() <= Date.now())
			throw new HttpError(401, "Сессия истекла. Войдите снова.");
		return this.user(session.username);
	}

	async logout(request: Request) {
		const token = this.token(request);
		if (token)
			await this.store.write((tx) =>
				tx.session.deleteMany({ where: { tokenHash: tokenHash(token) } }),
			);
	}

	cookie(token: string, clear = false) {
		return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : SESSION_SECONDS}${this.config.cookieSecure ? "; Secure" : ""}`;
	}
}

export function authorize(user: SessionUser, employeeId?: string) {
	if (user.role === "hr") return;
	if (!employeeId || user.employee_id !== employeeId)
		throw new HttpError(403, "Доступ запрещен.");
}
