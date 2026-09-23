import type { Store } from "../../utils/db";

export class CatalogService {
	constructor(private store: Store) {}
	async catalog() {
		const data = await this.store.readDataset();
		return {
			roles: data.role_profiles,
			skills: data.skills,
			as_of_date: data.as_of_date,
		};
	}
}
