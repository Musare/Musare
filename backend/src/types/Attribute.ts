import { Types } from "../Schema";
import { Document } from "./Document";

export type Attribute = {
	type: Types;
	required: boolean;
	restricted: boolean;
	item?: Pick<Attribute, "type" | "item" | "schema">;
	schema?: Document;
};
