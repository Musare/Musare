/* eslint no-var: 0 */
/* eslint vars-on-top: 0 */

declare global {
	var lofig: {
		config: object;
		fetchConfig: () => Promise<any>;
		get: (setting: string) => any;
	};
	var stationInterval: number;
	var YT: any;
	var stationNextSongTimeout: any;
	var grecaptcha: any;
	var addToPlaylistDropdown: any;
	var scrollDebounceId: any;
	var focusedElementBefore: any;
	var draggingItem:
		| undefined
		| {
				itemIndex: number;
				itemListUuid: string;
				itemGroup: string;
				itemOnMove?: (index: number) => any;
				initialItemIndex: number;
				initialItemListUuid: string;
		  };
	var MUSARE_VERSION: string;
	var MUSARE_GIT: {
		remote: string;
		remoteUrl: string;
		branch: string;
		latestCommit: string;
		latestCommitShort: string;
	};
}

export {};
