<template>
	<div v-if="isUser">
		<edit-playlist v-if="modals.station.editPlaylist" />
		<report v-if="modals.station.report" />
		<edit-song v-if="modals.admin.editSong" song-type="songs" />

		<metadata :title="`Profile | ${user.username}`" />
		<main-header />
		<div class="container">
			<div class="info-section">
				<div class="picture-name-row">
					<profile-picture
						:avatar="user.avatar"
						:name="user.name ? user.name : user.username"
					/>
					<div>
						<div class="name-row" v-if="user.name">
							<p class="name">{{ user.name }}</p>
							<span
								class="role admin"
								v-if="user.role === 'admin'"
								>admin</span
							>
						</div>
						<div class="username-row">
							<h2 class="username">@{{ user.username }}</h2>
							<span
								class="role admin"
								v-if="user.role === 'admin' && !user.name"
								>admin</span
							>
						</div>
					</div>
				</div>
				<div
					class="buttons"
					v-if="myUserId === userId || role === 'admin'"
				>
					<router-link
						:to="`/admin/users?userId=${user._id}`"
						class="button is-primary"
						v-if="role === 'admin'"
					>
						Edit
					</router-link>
					<router-link
						to="/settings"
						class="button is-primary"
						v-if="myUserId === userId"
					>
						Settings
					</router-link>
				</div>
				<div class="bio-row" v-if="user.bio">
					<i class="material-icons">notes</i>
					<p>{{ user.bio }}</p>
				</div>
				<div
					class="date-location-row"
					v-if="user.createdAt || user.location"
				>
					<div class="date" v-if="user.createdAt">
						<i
							class="material-icons"
							content="Account Creation Date"
							v-tippy
							>calendar_today</i
						>
						<p>{{ user.createdAt }}</p>
					</div>
					<div class="location" v-if="user.location">
						<i class="material-icons">location_on</i>
						<p>{{ user.location }}</p>
					</div>
				</div>
			</div>
			<div class="bottom-section">
				<div class="buttons">
					<button
						:class="{ active: tab === 'recent-activity' }"
						@click="showTab('recent-activity')"
					>
						Recent activity
					</button>
					<button
						:class="{ active: tab === 'playlists' }"
						@click="showTab('playlists')"
					>
						Playlists
					</button>
				</div>
				<playlists
					:user-id="userId"
					:username="user.name"
					v-show="tab === 'playlists'"
				/>
				<recent-activity
					:user-id="userId"
					v-show="tab === 'recent-activity'"
				/>
			</div>
		</div>
		<main-footer />
	</div>
</template>

<script>
import { mapState, mapGetters } from "vuex";
import { format, parseISO } from "date-fns";

import ProfilePicture from "@/components/ProfilePicture";
import MainHeader from "@/components/layout/MainHeader";
import MainFooter from "@/components/layout/MainFooter.vue";

import TabQueryHandler from "@/mixins/TabQueryHandler.vue";

import RecentActivity from "./tabs/RecentActivity.vue";
import Playlists from "./tabs/Playlists.vue";

export default {
	components: {
		MainHeader,
		MainFooter,
		ProfilePicture,
		RecentActivity,
		Playlists,
		EditPlaylist: () => import("@/components/modals/EditPlaylist.vue"),
		Report: () => import("@/components/modals/Report.vue"),
		EditSong: () => import("@/components/modals/EditSong.vue")
	},
	mixins: [TabQueryHandler],
	data() {
		return {
			user: {},
			userId: "",
			isUser: false,
			tab: "recent-activity"
		};
	},
	computed: {
		...mapState({
			role: state => state.user.auth.role,
			myUserId: state => state.user.auth.userId,
			...mapState("modalVisibility", {
				modals: state => state.modals
			})
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		if (
			this.$route.query.tab === "recent-activity" ||
			this.$route.query.tab === "playlists"
		)
			this.tab = this.$route.query.tab;

		this.socket.dispatch(
			"users.findByUsername",
			this.$route.params.username,
			res => {
				if (res.status === "error" || res.status === "failure")
					this.$router.push("/404");
				else {
					this.user = res.data;

					this.user.createdAt = format(
						parseISO(this.user.createdAt),
						"MMMM do yyyy"
					);

					this.isUser = true;
					this.userId = this.user._id;
				}
			}
		);
	}
};
</script>

<style lang="scss" scoped>
@media only screen and (max-width: 1250px) {
	.bottom-section .content {
		width: 650px !important;
	}
}

@media only screen and (max-width: 900px) {
	.info-section {
		margin-top: 0 !important;

		.picture-name-row {
			flex-direction: column !important;
		}

		.name-role-row {
			margin-top: 24px;
		}

		.buttons .button:not(:last-of-type) {
			margin-bottom: 10px;
			margin-right: 5px;
		}

		.date-location-row {
			flex-direction: column;
			width: auto !important;
		}

		.date-location-row > div:nth-child(2),
		.buttons .button:nth-child(2) {
			margin-left: 0 !important;
		}
	}

	.bottom-section {
		flex-direction: column;
	}

	.content {
		margin: 24px 0;
	}
}

.info-section {
	width: 912px;
	max-width: 100%;
	margin-left: auto;
	margin-right: auto;
	margin-top: 32px;
	padding: 24px;

	.picture-name-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: center;
		margin-bottom: 24px;

		.profile-picture {
			margin-right: 32px;
		}
	}

	.name-row,
	.username-row {
		display: flex;
		flex-direction: row;
		align-items: center;
	}

	.name {
		font-size: 34px;
		line-height: 40px;
		color: var(--dark-grey-4);
	}

	.role {
		padding: 2px 24px;
		color: var(--white);
		text-transform: uppercase;
		font-size: 12px;
		line-height: 14px;
		height: 18px;
		border-radius: 5px;
		margin-left: 12px;

		&.admin {
			background-color: var(--red);
		}
	}

	.username {
		font-size: 24px;
		line-height: 28px;
		color: var(--dark-grey);
		margin: 0;
	}

	.buttons {
		width: 388px;
		max-width: 100%;
		display: flex;
		flex-direction: row;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 24px;

		.button {
			flex: 1;
			font-size: 17px;
			line-height: 20px;

			&:nth-child(2) {
				margin-left: 20px;
			}
		}
	}

	.bio-row,
	.date-location-row {
		i {
			font-size: 24px;
			color: var(--dark-grey-2);
			margin-right: 12px;
		}

		p {
			font-size: 17px;
			line-height: 20px;
			color: var(--dark-grey-2);
			word-break: break-word;
		}
	}

	.bio-row {
		max-width: 608px;
		margin-bottom: 24px;
		margin-left: auto;
		margin-right: auto;
		display: flex;
		width: max-content;
	}

	.date-location-row {
		max-width: 608px;
		margin-left: auto;
		margin-right: auto;
		margin-bottom: 24px;
		display: flex;
		width: max-content;
		margin-bottom: 24px;

		> div:nth-child(2) {
			margin-left: 48px;
		}
	}

	.date,
	.location {
		display: flex;
	}
}

.bottom-section {
	max-width: 100%;
	margin-left: auto;
	margin-right: auto;
	padding: 24px;
	display: flex;

	.buttons {
		height: 100%;
		width: 250px;
		margin-right: 64px;

		button {
			outline: none;
			border: none;
			box-shadow: none;
			color: var(--primary-color);
			font-size: 22px;
			line-height: 26px;
			padding: 7px 0 7px 12px;
			width: 100%;
			text-align: left;
			cursor: pointer;
			border-radius: 5px;
			background-color: transparent;

			&.active {
				color: var(--white);
				background-color: var(--primary-color);
			}
		}
	}

	.content /deep/ {
		width: 800px;
		max-width: 100%;
		background-color: var(--white);
		padding: 30px 50px;
		border-radius: 3px;

		h3 {
			font-weight: 400;
		}

		.item {
			overflow: hidden;

			&:not(:last-of-type) {
				margin-bottom: 10px;
			}
		}

		#create-new-playlist-button {
			margin-top: 30px;
			width: 100%;
		}
	}
}

.night-mode {
	.name,
	.username,
	.bio-row i,
	.bio-row p,
	.date-location-row i,
	.date-location-row p,
	.item .left-part .top-text,
	.item .left-part .bottom-text,
	.bottom-section
		.content
		.item.activity-item
		.thumbnail
		.activity-type-icon {
		color: var(--light-grey-2);
	}
}
</style>
