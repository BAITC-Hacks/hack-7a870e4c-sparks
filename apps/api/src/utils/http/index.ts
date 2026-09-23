export class HttpError extends Error {
	constructor(
		readonly status: number,
		message: string,
	) {
		super(message);
	}
}

export async function mutation<T>(operation: () => Promise<T>): Promise<T> {
	try {
		return await operation();
	} catch (error) {
		if (error instanceof HttpError) throw error;
		// Database errors must not disclose SQL, credentials, or storage paths.
		if (
			error instanceof Error &&
			(/Prisma/i.test(error.name) || "code" in error)
		)
			throw error;
		throw new HttpError(
			400,
			error instanceof Error ? error.message : "Некорректные данные.",
		);
	}
}

export const secured = (
	operationId: string,
	summary: string,
	tag: string,
	description?: string,
) => ({
	operationId,
	summary,
	description,
	tags: [tag],
	security: [{ session: [] }],
});
