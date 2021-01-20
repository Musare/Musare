<template>
	<div class="queue-item">
		<div id="thumbnail-and-info">
			<img
				id="thumbnail"
				:src="song.ytThumbnail ? song.ytThumbnail : song.thumbnail"
				onerror="this.src='/assets/notes-transparent.png'"
			/>
			<div id="song-info">
				<h4
					id="song-title"
					:style="
						song.artists.length < 1 ? { fontSize: '16px' } : null
					"
				>
					{{ song.title }}
				</h4>
				<h5 id="song-artists" v-if="song.artists">
					{{ song.artists.join(", ") }}
				</h5>
				<p
					id="song-request-time"
					v-if="
						station.type === 'community' &&
							station.partyMode === true
					"
				>
					Requested by
					<strong>
						<user-id-to-username
							:user-id="song.requestedBy"
							:link="true"
						/>
						{{
							formatDistance(
								parseISO(song.requestedAt),
								new Date(),
								{
									addSuffix: true
								}
							)
						}}
					</strong>
				</p>
			</div>
		</div>
		<div id="duration-and-actions">
			<p id="song-duration">
				{{ utils.formatTime(song.duration) }}
			</p>
			<i
				v-if="
					station.type === 'community' &&
						($parent.isOwnerOnly() || $parent.isAdminOnly())
				"
				class="material-icons"
				id="remove-queue-item"
				@click="$parent.removeFromQueue(song.songId)"
				>delete_forever</i
			>
		</div>
	</div>
</template>

<script>
import { formatDistance, parseISO } from "date-fns";

import UserIdToUsername from "../../../../../components/common/UserIdToUsername.vue";
import utils from "../../../../../../js/utils";

export default {
	components: { UserIdToUsername },
	props: {
		song: {
			type: Object,
			default: () => {}
		},
		station: {
			type: Object,
			default: () => {
				return { type: "community", partyMode: false };
			}
		}
	},
	data() {
		return {
			utils
		};
	},
	methods: {
		formatDistance,
		parseISO
	}
};
</script>

<style lang="scss" scoped>
@import "../../../../../styles/global.scss";

.queue-item {
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
	padding: 7.5px;
	border: 1px solid $light-grey-2;
	border-radius: 3px;

	#thumbnail-and-info,
	#duration-and-actions {
		display: flex;
		align-items: center;
	}

	#thumbnail {
		width: 70px;
		height: 70px;
	}

	#song-info {
		display: flex;
		flex-direction: column;
		justify-content: center;
		margin-left: 25px;

		*:not(i) {
			margin: 0;
			font-family: Karla, Arial, sans-serif;
		}

		#song-title {
			font-size: 22px;
		}

		#song-artists {
			font-size: 16px;
		}

		#song-request-time {
			font-size: 12px;
			margin-top: 7px;
		}
	}

	#song-duration {
		font-size: 22px;
	}

	#remove-queue-item {
		cursor: pointer;
		margin-left: 10px;
	}
}
</style>
