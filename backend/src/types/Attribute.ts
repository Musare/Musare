import { Types } from "../Schema";
import { AttributeValue } from "./AttributeValue";
import { Document } from "./Document";

export type Attribute = {
	type: Types;
	required: boolean;
	restricted: boolean;
	item?: Pick<Attribute, "type" | "item" | "schema">;
	schema?: Document;
	defaultValue?: AttributeValue;
	unique?: boolean;
	min?: number;
	max?: number;
	enumValues?: AttributeValue[];
};
