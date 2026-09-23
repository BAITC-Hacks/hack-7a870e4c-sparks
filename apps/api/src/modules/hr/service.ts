import type { Store } from "../../utils/db";
import { hrOverview } from "../employees/service";
import { mutation } from "../../utils/http";

export class HrService {
	constructor(private store: Store) {}
	async overview() {
		return hrOverview(await this.store.readDataset());
	}
	async importData(employeesJson: string, historyCsv: string) {
		return mutation(() => this.store.importData(employeesJson, historyCsv));
	}
}
