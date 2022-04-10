import { defineAsyncComponent } from "vue";

const mapModalState = (namespace, map) => {
	const modalState = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalState[mapKey] = function func() {
			return mapValue(
				namespace
					.replace("MODAL_MODULE_PATH", this.modalModulePath)
					.replace("MODAL_UUID", this.modalUuid)
					.split("/")
					.reduce((a, b) => a[b], this.$store.state)
			);
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
					.replace("MODAL_MODULE_PATH", this.modalModulePath)
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
			defineAsyncComponent(() => import(`${baseDirectory}/${mapValue}`));
	});
	return modalComponents;
};

export { mapModalState, mapModalActions, mapModalComponents };
