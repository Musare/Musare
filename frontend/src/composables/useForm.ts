import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useModalsStore } from "@/stores/modals";

export const useForm = (
	inputOptions: {
		[key: string]:
			| {
					value: any;
					validate?: (value: any) => boolean | string;
			  }
			| any;
	},
	cb: (
		status: string,
		message: string,
		values: { [key: string]: any }
	) => Promise<void>,
	options?: {
		modalUuid?: string;
		preventCloseUnsaved?: boolean;
	}
) => {
	const { openModal, preventCloseUnsaved } = useModalsStore();

	const inputs = ref(
		Object.fromEntries(
			Object.entries(inputOptions).map(([name, input]) => {
				if (typeof input !== "object") input = { value: input };
				return [
					name,
					{
						...input,
						originalValue: input.value,
						errors: <string[]>[],
						ref: ref(),
						sourceChanged: false
					}
				];
			})
		)
	);

	const unsavedChanges = computed(() => {
		const changed = <string[]>[];
		Object.entries(inputs.value).forEach(([name, input]) => {
			if (
				JSON.stringify(input.value) !==
				JSON.stringify(input.originalValue)
			)
				changed.push(name);
		});
		return changed;
	});

	const sourceChanged = computed(() => {
		const _sourceChanged = <string[]>[];
		Object.entries(inputs.value).forEach(([name, input]) => {
			if (input.sourceChanged) _sourceChanged.push(name);
		});
		return _sourceChanged;
	});

	const useCallback = (status: string, message?: string) =>
		cb(
			status,
			message || status,
			Object.fromEntries(
				Object.entries(inputs.value).map(([name, input]) => [
					name,
					input.value
				])
			)
		);

	const resetOriginalValues = () => {
		inputs.value = Object.fromEntries(
			Object.entries(inputs.value).map(([name, input]) => [
				name,
				{
					...input,
					originalValue: input.value,
					sourceChanged: false
				}
			])
		);
	};

	const validate = () => {
		const invalid = <string[]>[];
		Object.entries(inputs.value).forEach(([name, input]) => {
			input.errors = [];
			if (input.validate) {
				const valid = input.validate(input.value);
				if (valid !== true) {
					invalid.push(name);
					input.errors.push(
						valid === false ? `Invalid ${name}` : valid
					);
				}
			}
		});
		return invalid;
	};

	const save = (saveCb?: () => void) => {
		const invalid = validate();
		if (invalid.length === 0 && unsavedChanges.value.length > 0) {
			const onSave = () => {
				useCallback("success")
					.then(() => {
						resetOriginalValues();
						if (saveCb) saveCb();
					})
					.catch((err: Error) => useCallback("error", err.message));
			};
			if (sourceChanged.value.length > 0)
				openModal({
					modal: "confirm",
					data: {
						message:
							"Updates have been made whilst you were making changes. Are you sure you want to continue?",
						onCompleted: onSave
					}
				});
			else onSave();
		} else if (invalid.length === 0) {
			useCallback("unchanged", "No changes to update");
			if (saveCb) saveCb();
		} else {
			useCallback("error", `${invalid.length} inputs failed validation.`);
		}
	};

	const setValue = (value: { [key: string]: any }) => {
		Object.entries(value).forEach(([name, inputValue]) => {
			if (inputs.value[name]) {
				inputs.value[name].sourceChanged = false;
				inputs.value[name].value = inputValue;
				inputs.value[name].originalValue = inputValue;
			}
		});
	};

	const setOriginalValue = (value: { [key: string]: any }) => {
		Object.entries(value).forEach(([name, inputValue]) => {
			if (inputs.value[name]) {
				if (
					JSON.stringify(inputValue) !==
					JSON.stringify(inputs.value[name].originalValue)
				) {
					if (unsavedChanges.value.find(change => change === name))
						inputs.value[name].sourceChanged = true;
					else inputs.value[name].value = inputValue;
					inputs.value[name].originalValue = inputValue;
				}
			}
		});
	};

	onMounted(() => {
		if (
			options &&
			options.modalUuid &&
			options.preventCloseUnsaved !== false
		)
			preventCloseUnsaved[options.modalUuid] = () =>
				unsavedChanges.value.length > 0;
	});

	onBeforeUnmount(() => {
		if (
			options &&
			options.modalUuid &&
			options.preventCloseUnsaved !== false
		)
			delete preventCloseUnsaved[options.modalUuid];
	});

	return {
		inputs,
		unsavedChanges,
		save,
		setValue,
		setOriginalValue
	};
};
