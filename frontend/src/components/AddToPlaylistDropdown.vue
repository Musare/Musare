<template>
	<tippy
		class="addToPlaylistDropdown"
		:touch="true"
		:interactive="true"
		:placement="placement"
		theme="addToPlaylist"
		ref="dropdown"
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
		<slot name="button" ref="trigger" />

		<template #content>
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

			<button
				id="create-playlist"
				class="button is-primary"
				@click="createPlaylist()"
			>
				<i class="material-icons icon-with-button"> edit </i>
				Create Playlist
			</button>
		</template>
	</tippy>
</template>

<script>
import { mapGetters, mapState, mapActions } from "vuex";
import Toast from "toasters";
import ws from "@/ws";

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
		playlists() {
			return this.$store.state.user.playlists.playlists.filter(
				playlist => playlist.isUserModifiable
			);
		}
	},
	mounted() {
		ws.onConnect(this.init);

		this.socket.on(
			"event:playlist.created",
			res => this.addPlaylist(res.data.playlist),
			{ replaceable: true }
		);

		this.socket.on(
			"event:playlist.deleted",
			res => this.removePlaylist(res.data.playlistId),
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
		init() {
			if (!this.fetchedPlaylists)
				this.socket.dispatch(
					"playlists.indexMyPlaylists",
					true,
					res => {
						if (res.status === "success")
							if (!this.fetchedPlaylists)
								this.setPlaylists(res.data.playlists);
					}
				);
		},
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
				playlist.songs
					.map(song => song.youtubeId)
					.indexOf(this.song.youtubeId) !== -1
			);
		},
		createPlaylist() {
			this.$refs.dropdown.tippy.setProps({
				zIndex: 0,
				hideOnClick: false
			});

			window.addToPlaylistDropdown = this.$refs.dropdown;

			this.openModal("createPlaylist");
		},
		...mapActions("user/playlists", [
			"setPlaylists",
			"addPlaylist",
			"removePlaylist"
		]),
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="scss" scoped>
.nav-dropdown-items button .control {
	margin-bottom: 0 !important;
}

#create-playlist {
	margin-top: 10px;

	i {
		color: #fff;
	}
}

.addToPlaylistDropdown {
	display: flex;
}
</style>
