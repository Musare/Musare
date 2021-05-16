<template>
	<tippy
		class="addToPlaylistDropdown"
		interactive="true"
		:placement="placement"
		theme="addToPlaylist"
		trigger="click"
		append-to="parent"
		@show="
			() => {
				$parent.showPlaylistDropdown = true;
			}
		"
		@hide="
			() => {
				$parent.showPlaylistDropdown = false;
			}
		"
	>
		<template #trigger>
			<slot name="button" />
		</template>

		<div class="nav-dropdown-items" v-if="playlists.length > 0">
			<button
				class="nav-item"
				href="#"
				v-for="(playlist, index) in playlists"
				:key="playlist._id"
				@click.prevent="toggleSongInPlaylist(index)"
				:title="playlist.displayName"
			>
				<p class="control is-expanded checkbox-control">
					<label class="switch">
						<input
							type="checkbox"
							:id="index"
							:checked="hasSong(playlist)"
							@click="toggleSongInPlaylist(index)"
						/>
						<span class="slider round"></span>
					</label>
					<label :for="index">
						<span></span>
						<p>{{ playlist.displayName }}</p>
					</label>
				</p>
			</button>
		</div>
		<p v-else>You haven't created any playlists.</p>
	</tippy>
</template>

<script>
import { mapGetters, mapState, mapActions } from "vuex";
import Toast from "toasters";

export default {
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		placement: {
			type: String,
			default: "left"
		}
	},
	computed: {
		...mapGetters({
			socket: "websockets/getSocket"
		}),
		...mapState({
			fetchedPlaylists: state => state.user.playlists.fetchedPlaylists
		}),
		playlists: {
			get() {
				return this.$store.state.user.playlists.playlists.filter(
					playlist => playlist.isUserModifiable
				);
			},
			set(playlists) {
				this.$store.commit("user/playlists/setPlaylists", playlists);
			}
		}
	},
	mounted() {
		if (!this.fetchedPlaylists)
			this.socket.dispatch("playlists.indexMyPlaylists", false, res => {
				if (res.status === "success")
					this.setPlaylists(res.data.playlists);
			});

		this.socket.on(
			"event:playlist.created",
			res => this.playlists.push(res.data.playlist),
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.deleted",
			res => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === res.data.playlistId) {
						this.playlists.splice(index, 1);
					}
				});
			},
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.displayName.updated",
			res => {
				this.playlists.forEach((playlist, index) => {
					if (playlist._id === res.data.playlistId) {
						this.playlists[index].displayName =
							res.data.displayName;
					}
				});
			},
			{ replaceable: true }
		);
	},
	methods: {
		toggleSongInPlaylist(playlistIndex) {
			const playlist = this.playlists[playlistIndex];
			if (!this.hasSong(playlist)) {
				this.socket.dispatch(
					"playlists.addSongToPlaylist",
					false,
					this.song.youtubeId,
					playlist._id,
					res => new Toast(res.message)
				);
			} else {
				this.socket.dispatch(
					"playlists.removeSongFromPlaylist",
					this.song.youtubeId,
					playlist._id,
					res => new Toast(res.message)
				);
			}
		},
		hasSong(playlist) {
			return (
				playlist.songs.map(song => song._id).indexOf(this.song._id) !==
				-1
			);
		},
		...mapActions("user/playlists", ["setPlaylists"])
	}
};
</script>

<style lang="scss" scoped>
.nav-dropdown-items button .control {
	margin-bottom: 0 !important;
}
</style>
