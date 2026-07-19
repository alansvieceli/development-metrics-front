const DEFAULT_URL =
	"postgresql://postgres:postgres@localhost:5432/development_metrics_test";

export function getTestDatabaseUrl(
	value = process.env.TEST_DATABASE_URL ?? DEFAULT_URL,
) {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		throw new Error("TEST_DATABASE_URL deve ser uma URL PostgreSQL válida");
	}

	const database = decodeURIComponent(url.pathname.slice(1));
	if (
		!["postgres:", "postgresql:"].includes(url.protocol) ||
		!database ||
		database.includes("/") ||
		!database.endsWith("_test")
	) {
		throw new Error(
			"TEST_DATABASE_URL deve apontar para banco terminado em _test",
		);
	}

	return value;
}
