import { defineAsyncComponent } from "vue";

const mapModalState = (namespace, map) => {
	const modalState = {};
	// console.log("MAP MODAL STATE", namespace);

	Object.entries(map).forEach(([mapKey, mapValue]: [string, (value: object) => void]) => {
		modalState[mapKey] = function func() {
			// console.log(
			// 	321,
			// 	namespace
			// 		.replace(
			// 			"MODAL_MODULE_PATH",
			// 			namespace.indexOf("MODAL_MODULE_PATH") !== -1
			// 				? this.modalModulePath
			// 				: null
			// 		)
			// 		.replace("MODAL_UUID", this.modalUuid)
			// 		.split("/")
			// );
			// console.log(3211, mapKey);

			const state = namespace
				.replace(
					"MODAL_MODULE_PATH",
					namespace.indexOf("MODAL_MODULE_PATH") !== -1
						? this.modalModulePath
						: null
				)
				.replace("MODAL_UUID", this.modalUuid)
				.split("/")
				.reduce((a, b) => a[b], this.$store.state);

			// console.log(32111, state);
			// if (state) console.log(321111, mapValue(state));
			// else console.log(321111, "NADA");

			if (state) return mapValue(state);
			return mapValue({});
		};
	});
	return modalState;
};

const mapModalActions = (namespace, map) => {
	const modalState = {};
	map.forEach(mapValue => {
		modalState[mapValue] = function func(value) {
			return this.$store.dispatch(
				`${namespace
					.replace(
						"MODAL_MODULE_PATH",
						namespace.indexOf("MODAL_MODULE_PATH") !== -1
							? this.modalModulePath
							: null
					)
					.replace("MODAL_UUID", this.modalUuid)}/${mapValue}`,
				value
			);
		};
	});
	return modalState;
};

const mapModalComponents = (baseDirectory, map) => {
	const modalComponents = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalComponents[mapKey] = () =>
			defineAsyncComponent(() =>
				import(`./${baseDirectory}/${mapValue}`)
			);
	});
	return modalComponents;
};

export { mapModalState, mapModalActions, mapModalComponents };
