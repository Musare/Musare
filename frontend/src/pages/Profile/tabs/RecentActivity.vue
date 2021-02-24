<template>
	<div class="content recent-activity-tab">
		<div v-if="activities.length > 0">
			<h4 class="section-title">Recent activity</h4>

			<p class="section-description">
				This is a log of all actions
				{{ userId === myUserId ? "you have" : `${username} has` }}
				taken recently.
			</p>

			<hr class="section-horizontal-rule" />

			<div id="activity-items" @scroll="handleScroll">
				<activity-item
					class="item activity-item universal-item"
					v-for="activity in activities"
					:key="activity._id"
					:activity="activity"
				>
					<div slot="actions">
						<a
							v-if="userId === myUserId"
							href="#"
							@click.prevent="hideActivity(activity._id)"
						>
							<i class="material-icons hide-icon"
								>visibility_off</i
							>
						</a>
					</div>
				</activity-item>
			</div>
		</div>
		<div v-else>
			<h3>No recent activity.</h3>
		</div>
	</div>
</template>

<script>
import { mapState } from "vuex";
import Toast from "toasters";

import io from "../../../io";

import ActivityItem from "../../../components/ui/ActivityItem.vue";

export default {
	components: { ActivityItem },
	props: {
		userId: {
			type: String,
			default: ""
		}
	},
	data() {
		return {
			activities: [],
			position: 1,
			maxPosition: 1,
			offsettedFromNextSet: 0,
			isGettingSet: false
		};
	},
	computed: {
		...mapState({
			...mapState("modalVisibility", {
				modals: state => state.modals.station
			}),
			myUserId: state => state.user.auth.userId,
			username: state => state.user.auth.username
		})
	},
	mounted() {
		io.getSocket(socket => {
			this.socket = socket;

			if (this.myUserId !== this.userId) {
				this.socket.emit(
					"apis.joinRoom",
					`profile-${this.userId}-activities`,
					() => {}
				);
			}

			this.socket.emit("activities.length", this.userId, length => {
				this.maxPosition = Math.ceil(length / 15) + 1;
				this.getSet();
			});

			this.socket.on("event:activity.create", activity => {
				this.activities.unshift(activity);
				this.offsettedFromNextSet += 1;
			});

			this.socket.on("event:activity.hide", activityId => {
				this.activities = this.activities.filter(
					activity => activity._id !== activityId
				);

				this.offsettedFromNextSet -= 1;
			});

			this.socket.on("event:activity.removeAllForUser", () => {
				this.activities = [];
				this.position = 1;
				this.maxPosition = 1;
				this.offsettedFromNextSet = 0;
			});
		});
	},
	methods: {
		hideActivity(activityId) {
			this.socket.emit("activities.hideActivity", activityId, res => {
				if (res.status !== "success")
					new Toast({ content: res.message, timeout: 3000 });
			});
		},
		getSet() {
			if (this.isGettingSet) return;
			if (this.position >= this.maxPosition) return;

			this.isGettingSet = true;

			this.socket.emit(
				"activities.getSet",
				this.userId,
				this.position,
				this.offsettedFromNextSet,
				res => {
					if (res.status === "success") {
						this.activities.push(...res.data);
						this.position += 1;
					}

					this.isGettingSet = false;
				}
			);
		},
		handleScroll(event) {
			const scrollPosition =
				event.target.clientHeight + event.target.scrollTop;
			const bottomPosition = event.target.scrollHeight;

			if (this.loadAllSongs) return false;

			if (scrollPosition + 100 >= bottomPosition) this.getSet();

			return this.maxPosition === this.position;
		}
	}
};
</script>

<style lang="scss" scoped>
#activity-items {
	overflow: auto;
	height: 600px;
}
</style>
