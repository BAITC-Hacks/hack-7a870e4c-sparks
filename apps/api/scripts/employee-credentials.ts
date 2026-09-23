import { readConfig, validateCredentials } from "../src/utils/config";
import { Store } from "../src/utils/db";
import { AuthService, employeePassword } from "../src/modules/auth/service";

const id = process.argv[2];
if (!id || id === "hr")
	throw new Error(
		"Укажите ID сотрудника: bun run credentials:employee EMPLOYEE_ID",
	);
const config = readConfig();
validateCredentials(config);
const store = await Store.open(config.databaseUrl);
try {
	const employee = await store.prisma.employee.findUnique({ where: { id } });
	if (!employee) throw new Error("Сотрудник не найден.");
	await new AuthService(store, config).bootstrap();
	const password =
		id === config.demoEmployeeId && config.demoEmployeePassword
			? config.demoEmployeePassword
			: employeePassword(config.credentialSecret, id);
	const account = await store.prisma.account.findUnique({
		where: { username: id },
	});
	if (!account || !(await Bun.password.verify(password, account.passwordHash)))
		throw new Error(
			"Секрет изменился после создания аккаунта. Исходный пароль нельзя восстановить из текущей конфигурации.",
		);
	console.info(
		`Логин: ${id}\nПароль: ${password}\nПередайте приватно; не публикуйте вывод.`,
	);
} finally {
	await store.close();
}
