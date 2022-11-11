import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useModalsStore } from "@/stores/modals";

export const useForm = (
	inputOptions: Record<
		string,
		| {
				value: any;
				validate?: (value: any) => boolean | string;
		  }
		| any
	>,
	cb: (
		response: {
			status: string;
			messages: Record<string, string>;
			values: Record<string, any>;
		},
		resolve: (value?: undefined) => void,
		reject: (value: Error) => void
	) => void,
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
						originalValue: JSON.parse(JSON.stringify(input.value)),
						errors: [],
						ref: ref(),
						sourceChanged: false,
						ignoreUnsaved: input.ignoreUnsaved === true,
						required:
							input.required === undefined ? true : input.required
					}
				];
			})
		)
	);

	const unsavedChanges = computed(() => {
		const changed: string[] = [];
		Object.entries(inputs.value).forEach(([name, input]) => {
			if (
				!input.ignoreUnsaved &&
				JSON.stringify(input.value) !==
					JSON.stringify(input.originalValue)
			)
				changed.push(name);
		});
		return changed;
	});

	const sourceChanged = computed(() => {
		const _sourceChanged: string[] = [];
		Object.entries(inputs.value).forEach(([name, input]) => {
			if (
				input.sourceChanged &&
				unsavedChanges.value.find(change => change === name)
			)
				_sourceChanged.push(name);
		});
		return _sourceChanged;
	});

	const useCallback = (status: string, messages?: Record<string, string>) =>
		new Promise((resolve, reject: (reason: Error) => void) => {
			cb(
				{
					status,
					messages: { ...messages },
					values: Object.fromEntries(
						Object.entries(inputs.value).map(([name, input]) => [
							name,
							input.value
						])
					)
				},
				resolve,
				reject
			);
		});

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
		const invalid: Record<string, string[]> = {};
		Object.entries(inputs.value).forEach(([name, input]) => {
			input.errors = [];
			if (
				input.required &&
				(input.value === undefined ||
					input.value === "" ||
					input.value === null)
			)
				input.errors.push(`Invalid ${name}. Please provide value`);
			if (input.validate) {
				const valid = input.validate(input.value);
				if (valid !== true) {
					input.errors.push(
						valid === false ? `Invalid ${name}` : valid
					);
				}
			}
			if (input.errors.length > 0)
				invalid[name] = input.errors.join(", ");
		});
		return invalid;
	};

	const save = (saveCb?: () => void) => {
		const errors = validate();
		const errorCount = Object.keys(errors).length;
		if (errorCount === 0 && unsavedChanges.value.length > 0) {
			const onSave = () => {
				useCallback("success")
					.then(() => {
						resetOriginalValues();
						if (saveCb) saveCb();
					})
					.catch((err: Error) =>
						useCallback("error", { error: err.message })
					);
			};
			if (sourceChanged.value.length > 0)
				openModal({
					modal: "confirm",
					props: {
						message:
							"Updates have been made whilst you were making changes. Are you sure you want to continue?",
						onCompleted: onSave
					}
				});
			else onSave();
		} else if (errorCount === 0) {
			useCallback("unchanged", { unchanged: "No changes have been made" })
				.then(() => {
					if (saveCb) saveCb();
				})
				.catch((err: Error) =>
					useCallback("error", { error: err.message })
				);
		} else {
			useCallback("error", {
				...errors,
				error: `${errorCount} ${
					errorCount === 1 ? "input" : "inputs"
				} failed validation.`
			});
		}
	};

	const setValue = (value: Record<string, any>, reset?: boolean) => {
		Object.entries(value).forEach(([name, inputValue]) => {
			if (inputs.value[name]) {
				inputs.value[name].value = JSON.parse(
					JSON.stringify(inputValue)
				);
				if (reset) {
					inputs.value[name].sourceChanged = false;
					inputs.value[name].originalValue = JSON.parse(
						JSON.stringify(inputValue)
					);
				}
			}
		});
	};

	const setOriginalValue = (value: Record<string, any>) => {
		Object.entries(value).forEach(([name, inputValue]) => {
			if (inputs.value[name]) {
				if (
					JSON.stringify(inputValue) !==
					JSON.stringify(inputs.value[name].originalValue)
				) {
					if (unsavedChanges.value.find(change => change === name))
						inputs.value[name].sourceChanged = true;
					else
						inputs.value[name].value = JSON.parse(
							JSON.stringify(inputValue)
						);
					inputs.value[name].originalValue = JSON.parse(
						JSON.stringify(inputValue)
					);
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
