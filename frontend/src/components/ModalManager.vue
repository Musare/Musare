<script setup lang="ts">
import { useStore } from "vuex";
import { computed, shallowRef } from "vue";
import { useModalComponents } from "@/vuex_helpers";

const store = useStore();

const activeModals = computed(() => store.state.modalVisibility.activeModals);
const modals = computed(() => store.state.modalVisibility.modals);

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
