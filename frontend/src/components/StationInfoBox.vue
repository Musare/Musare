<template>
	<div class="about-station-container">
		<div class="station-info">
			<div class="row station-name">
				<h1>{{ station.displayName }}</h1>
				<i
					v-if="station.type === 'official'"
					class="material-icons verified-station"
					content="Verified Station"
					v-tippy
				>
					check_circle
				</i>
				<a>
					<!-- Favorite Station Button -->
					<i
						v-if="loggedIn && station.isFavorited"
						@click.prevent="unfavoriteStation()"
						content="Unfavorite Station"
						v-tippy
						class="material-icons"
						>star</i
					>
					<i
						v-if="loggedIn && !station.isFavorited"
						@click.prevent="favoriteStation()"
						class="material-icons"
						content="Favorite Station"
						v-tippy
						>star_border</i
					>
				</a>
			</div>
			<p>{{ station.description }}</p>
		</div>

		<div class="admin-buttons">
			<!-- (Admin) Pause/Resume Button -->
			<button
				class="button is-danger"
				v-if="isOwnerOrAdmin() && stationPaused"
				@click="resumeStation()"
			>
				<i class="material-icons icon-with-button">play_arrow</i>
				<span> Resume Station </span>
			</button>
			<button
				class="button is-danger"
				@click="pauseStation()"
				v-if="isOwnerOrAdmin() && !stationPaused"
			>
				<i class="material-icons icon-with-button">pause</i>
				<span> Pause Station </span>
			</button>

			<!-- (Admin) Skip Button -->
			<button
				class="button is-danger"
				@click="skipStation()"
				v-if="isOwnerOrAdmin()"
			>
				<i class="material-icons icon-with-button">skip_next</i>
				<span> Force Skip </span>
			</button>

			<!-- (Admin) Station Settings Button -->
			<button
				class="button is-primary"
				@click="
					openModal({
						modal: 'manageStation',
						data: {
							stationId: station._id,
							sector: 'station'
						}
					})
				"
				v-if="isOwnerOrAdmin() && showManageStation"
			>
				<i class="material-icons icon-with-button">settings</i>
				<span> Manage Station </span>
			</button>
			<router-link
				v-if="showGoToStation"
				:to="{
					name: 'station',
					params: { id: station.name }
				}"
				class="button is-primary"
			>
				Go To Station
			</router-link>
		</div>
	</div>
</template>

<script>
import { mapGetters, mapState, mapActions } from "vuex";
import Toast from "toasters";

export default {
	props: {
		station: { type: Object, default: null },
		stationPaused: { type: Boolean, default: null },
		showManageStation: { type: Boolean, default: false },
		showGoToStation: { type: Boolean, default: false }
	},
	data() {
		return {};
	},
	computed: {
		...mapState({
			loggedIn: state => state.user.auth.loggedIn,
			userId: state => state.user.auth.userId,
			role: state => state.user.auth.role
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {},
	methods: {
		isOwnerOnly() {
			return this.loggedIn && this.userId === this.station.owner;
		},
		isAdminOnly() {
			return this.loggedIn && this.role === "admin";
		},
		isOwnerOrAdmin() {
			return this.isOwnerOnly() || this.isAdminOnly();
		},
		resumeStation() {
			this.socket.dispatch("stations.resume", this.station._id, data => {
				if (data.status !== "success")
					new Toast(`Error: ${data.message}`);
				else new Toast("Successfully resumed the station.");
			});
		},
		pauseStation() {
			this.socket.dispatch("stations.pause", this.station._id, data => {
				if (data.status !== "success")
					new Toast(`Error: ${data.message}`);
				else new Toast("Successfully paused the station.");
			});
		},
		skipStation() {
			this.socket.dispatch(
				"stations.forceSkip",
				this.station._id,
				data => {
					if (data.status !== "success")
						new Toast(`Error: ${data.message}`);
					else
						new Toast(
							"Successfully skipped the station's current song."
						);
				}
			);
		},
		favoriteStation() {
			this.socket.dispatch(
				"stations.favoriteStation",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast("Successfully favorited station.");
					} else new Toast(res.message);
				}
			);
		},
		unfavoriteStation() {
			this.socket.dispatch(
				"stations.unfavoriteStation",
				this.station._id,
				res => {
					if (res.status === "success") {
						new Toast("Successfully unfavorited station.");
					} else new Toast(res.message);
				}
			);
		},
		...mapActions("modalVisibility", ["openModal"])
	}
};
</script>

<style lang="less">
.night-mode {
	.about-station-container {
		background-color: var(--dark-grey-3) !important;
	}
}

.about-station-container {
	padding: 20px;
	display: flex;
	flex-direction: column;
	flex-grow: unset;

	.row {
		display: flex;
		flex-direction: row;
		max-width: 100%;
	}

	.station-info {
		.station-name {
			flex-direction: row !important;

			h1 {
				margin: 0;
				font-size: 36px;
				line-height: 0.8;
				text-overflow: ellipsis;
				overflow: hidden;
			}

			i {
				margin-left: 10px;
				font-size: 30px;
				color: var(--yellow);
				&.stationMode {
					padding-left: 10px;
					margin-left: auto;
					color: var(--primary-color);
				}
			}

			.verified-station {
				color: var(--primary-color);
			}
		}

		p {
			display: -webkit-box;
			max-width: 700px;
			margin-bottom: 10px;
			overflow: hidden;
			text-overflow: ellipsis;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 3;
		}
	}

	.admin-buttons {
		display: flex;

		.button {
			margin: 3px;
		}
	}
}
</style>