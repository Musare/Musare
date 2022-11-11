declare module "toasters" {
	export interface ToastObject {
		content?: string;
		persistent?: boolean;
		timeout?: number;
		interactable?: boolean;
		visible?: boolean;
	}

	export default class Toast {
		constructor(
			value: ToastObject["content"] | ToastObject,
			options?: ToastObject
		);

		get visible(): ToastObject["visible"];

		set visible(value: ToastObject["visible"]);

		get content(): ToastObject["content"];

		set content(value: ToastObject["content"]);

		startTimer(): void;

		dragListener(): void;

		handleInputLoss(): void;

		find(): HTMLElement;

		destroy(): void;

		show(): void;

		hide(): void;
	}
}
