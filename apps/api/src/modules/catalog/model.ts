import { t } from "elysia";
import { object } from "../../utils/http/model";
import { RoleProfile, Skill } from "../employees/model";
const DateString = t.String();
export const Catalog = object({
	roles: t.Array(RoleProfile),
	skills: t.Array(Skill),
	as_of_date: DateString,
});
