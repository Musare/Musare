<template>
	<modal title="Import Playlist">
		<template #body>
			<div class="vertical-padding">
				<p class="section-description">
					Import a playlist by using a link from YouTube
				</p>

				<div class="control is-grouped">
					<p class="control is-expanded">
						<input
							class="input"
							type="text"
							placeholder="YouTube Playlist URL"
							v-model="youtubeSearch.playlist.query"
							@keyup.enter="importPlaylist()"
						/>
					</p>
					<p id="playlist-import-type" class="control select">
						<select
							v-model="
								youtubeSearch.playlist.isImportingOnlyMusic
							"
						>
							<option :value="false">Import all</option>
							<option :value="true">Import only music</option>
						</select>
					</p>
					<p class="control">
						<button
							class="button is-info"
							@click.prevent="importPlaylist()"
						>
							<i class="material-icons icon-with-button"
								>publish</i
							>Import
						</button>
					</p>
				</div>
			</div>
		</template>
		<template #footer>
			<p class="is-expanded checkbox-control">
				<label class="switch">
					<input
						type="checkbox"
						id="edit-imported-songs"
						v-model="localEditSongs"
					/>
					<span class="slider round"></span>
				</label>

				<label for="edit-imported-songs">
					<p>Edit Songs</p>
				</label>
			</p>
		</template>
	</modal>
</template>

<script>
import { mapActions, mapState, mapGetters } from "vuex";

import Toast from "toasters";

import SearchYoutube from "@/mixins/SearchYoutube.vue";

export default {
	mixins: [SearchYoutube],
	props: {
		modalUuid: { type: String, default: "" }
	},
	computed: {
		localEditSongs: {
			get() {
				return this.$store.state.modals.importPlaylist[this.modalUuid]
					.editImportedSongs;
			},
			set(editImportedSongs) {
				this.$store.commit(
					`modals/importPlaylist/${this.modalUuid}/updateEditImportedSongs`,
					editImportedSongs
				);
			}
		},
		...mapState({
			loggedIn: state => state.user.auth.loggedIn
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	beforeUnmount() {
		// Delete the VueX module that was created for this modal, after all other cleanup tasks are performed
		this.$store.unregisterModule([
			"modals",
			"importPlaylist",
			this.modalUuid
		]);
	},
	methods: {
		importPlaylist() {
			let isImportingPlaylist = true;

			// import query is blank
			if (!this.youtubeSearch.playlist.query)
				return new Toast("Please enter a YouTube playlist URL.");

			const regex = /[\\?&]list=([^&#]*)/;
			const splitQuery = regex.exec(this.youtubeSearch.playlist.query);

			if (!splitQuery) {
				return new Toast({
					content: "Please enter a valid YouTube playlist URL.",
					timeout: 4000
				});
			}

			// don't give starting import message instantly in case of instant error
			setTimeout(() => {
				if (isImportingPlaylist) {
					new Toast(
						"Starting to import your playlist. This can take some time to do."
					);
				}
			}, 750);

			return this.socket.dispatch(
				"songs.requestSet",
				this.youtubeSearch.playlist.query,
				this.youtubeSearch.playlist.isImportingOnlyMusic,
				true,
				res => {
					isImportingPlaylist = false;

					if (
						this.localEditSongs &&
						res.status === "success" &&
						res.songs &&
						res.songs.length > 0
					) {
						this.openModal({
							modal: "editSongs",
							data: {
								songs: res.songs.map(song => ({
									...song,
									songId: song._id
								}))
							}
						});
					}

					this.closeCurrentModal();
					return new Toast({
						content: res.message,
						timeout: 20000
					});
				}
			);
		},
		...mapActions("modalVisibility", ["openModal", "closeCurrentModal"])
	}
};
</script>
