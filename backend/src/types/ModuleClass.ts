import ModuleManager from "../ModuleManager";
import { ValueOf } from "./ValueOf";
import { Modules } from "./TestModules";

export type ModuleClass = {
	new (moduleManager: ModuleManager): ValueOf<Modules>;
};
