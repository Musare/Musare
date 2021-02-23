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

			<activity-item
				class="item activity-item universal-item"
				v-for="activity in sortedActivities"
				:key="activity._id"
				:activity="activity"
			>
				<div slot="actions">
					<a
						v-if="userId === myUserId"
						href="#"
						@click.prevent="hideActivity(activity._id)"
					>
						<i class="material-icons hide-icon">visibility_off</i>
					</a>
				</div>
			</activity-item>
		</div>
		<div v-else>
			<h3>No recent activity.</h3>
		</div>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";
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
	computed: {
		sortedActivities() {
			const { activities } = this;
			return activities.sort(
				(x, y) => new Date(y.createdAt) - new Date(x.createdAt)
			);
		},
		...mapState({
			activities: state => state.user.activities.activities,
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

			this.socket.emit("activities.getSet", this.userId, 1, res => {
				if (res.status === "success")
					this.addSetOfActivities({
						activities: res.data,
						set: 1
					});
			});

			this.socket.on("event:activity.create", activity =>
				this.addActivity(activity)
			);

			this.socket.on("event:activity.hide", activityId =>
				this.removeActivity(activityId)
			);

			this.socket.on("event:activity.removeAllForUser", () =>
				this.removeAllActivities()
			);
		});
	},
	methods: {
		hideActivity(activityId) {
			this.socket.emit("activities.hideActivity", activityId, res => {
				if (res.status !== "success")
					new Toast({ content: res.message, timeout: 3000 });
			});
		},
		...mapActions("user/activities", [
			"addSetOfActivities",
			"addActivity",
			"removeActivity",
			"removeAllActivities"
		])
	}
};
</script>
