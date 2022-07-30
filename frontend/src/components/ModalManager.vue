<script setup lang="ts">
import { shallowRef } from "vue";
import { storeToRefs } from "pinia";
import { useModalsStore, useModalComponents } from "@/stores/modals";

const modalsStore = useModalsStore();
const { modals, activeModals } = storeToRefs(modalsStore);

const modalComponents = shallowRef(
	useModalComponents("components/modals", {
		editUser: "EditUser.vue",
		login: "Login.vue",
		register: "Register.vue",
		whatIsNew: "WhatIsNew.vue",
		createStation: "CreateStation.vue",
		editNews: "EditNews.vue",
		manageStation: "ManageStation/index.vue",
		editPlaylist: "EditPlaylist/index.vue",
		createPlaylist: "CreatePlaylist.vue",
		report: "Report.vue",
		viewReport: "ViewReport.vue",
		bulkActions: "BulkActions.vue",
		viewApiRequest: "ViewApiRequest.vue",
		viewPunishment: "ViewPunishment.vue",
		removeAccount: "RemoveAccount.vue",
		importAlbum: "ImportAlbum.vue",
		confirm: "Confirm.vue",
		editSongs: "EditSongs.vue",
		editSong: "EditSong/index.vue",
		viewYoutubeVideo: "ViewYoutubeVideo.vue"
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
