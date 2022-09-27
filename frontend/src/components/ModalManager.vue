<script setup lang="ts">
import { defineAsyncComponent, shallowRef } from "vue";
import { storeToRefs } from "pinia";
import { useModalsStore } from "@/stores/modals";

const modalsStore = useModalsStore();
const { modals, activeModals } = storeToRefs(modalsStore);

const useModalComponents = (map: { [key: string]: string }) => {
	const modalComponents: { [key: string]: string } = {};
	Object.entries(map).forEach(([mapKey, mapValue]) => {
		modalComponents[mapKey] = defineAsyncComponent(
			() => import(`./modals/${mapValue}.vue`)
		);
	});
	return modalComponents;
};

const modalComponents = shallowRef(
	useModalComponents({
		editUser: "EditUser",
		login: "Login",
		register: "Register",
		whatIsNew: "WhatIsNew",
		createStation: "CreateStation",
		editNews: "EditNews",
		manageStation: "ManageStation/index",
		editPlaylist: "EditPlaylist/index",
		createPlaylist: "CreatePlaylist",
		report: "Report",
		viewReport: "ViewReport",
		bulkActions: "BulkActions",
		viewApiRequest: "ViewApiRequest",
		viewPunishment: "ViewPunishment",
		removeAccount: "RemoveAccount",
		importAlbum: "ImportAlbum",
		confirm: "Confirm",
		editSong: "EditSong/index",
		viewYoutubeVideo: "ViewYoutubeVideo"
	})
);
</script>

<template>
	<div>
		<div v-for="activeModalUuid in activeModals" :key="activeModalUuid">
			<component
				:is="modalComponents[modals[activeModalUuid]]"
				:modal-uuid="activeModalUuid"
			/>
		</div>
	</div>
</template>
