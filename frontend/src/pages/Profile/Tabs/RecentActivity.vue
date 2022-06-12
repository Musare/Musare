<template>
	<div class="content recent-activity-tab">
		<div v-if="activities.length > 0">
			<h4 class="section-title">Recent activity</h4>

			<p class="section-description">
				This is a log of all actions
				{{ userId === myUserId ? "you have" : `${username} has` }}
				taken recently
			</p>

			<hr class="section-horizontal-rule" />

			<div id="activity-items">
				<activity-item
					class="item activity-item universal-item"
					v-for="activity in activities"
					:key="activity._id"
					:activity="activity"
				>
					<template #actions>
						<quick-confirm
							v-if="userId === myUserId"
							@confirm="hideActivity(activity._id)"
						>
							<a content="Hide Activity" v-tippy>
								<i class="material-icons hide-icon"
									>visibility_off</i
								>
							</a>
						</quick-confirm>
					</template>
				</activity-item>
			</div>
		</div>
		<div v-else>
			<h5>No recent activity.</h5>
		</div>
	</div>
</template>

<script>
import { mapState, mapGetters, mapActions } from "vuex";
import Toast from "toasters";

import ActivityItem from "@/components/ActivityItem.vue";
import ws from "@/ws";

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
			username: "",
			activities: [],
			position: 1,
			maxPosition: 1,
			offsettedFromNextSet: 0,
			isGettingSet: false
		};
	},
	computed: {
		...mapState({
			myUserId: state => state.user.auth.userId
		}),
		...mapGetters({
			socket: "websockets/getSocket"
		})
	},
	mounted() {
		window.addEventListener("scroll", this.handleScroll);

		ws.onConnect(this.init);

		this.socket.on("event:activity.updated", res => {
			this.activities.find(
				activity => activity._id === res.data.activityId
			).payload.message = res.data.message;
		});

		this.socket.on("event:activity.created", res => {
			this.activities.unshift(res.data.activity);
			this.offsettedFromNextSet += 1;
		});

		this.socket.on("event:activity.hidden", res => {
			this.activities = this.activities.filter(
				activity => activity._id !== res.data.activityId
			);

			this.offsettedFromNextSet -= 1;
		});

		this.socket.on("event:activity.removeAllForUser", () => {
			this.activities = [];
			this.position = 1;
			this.maxPosition = 1;
			this.offsettedFromNextSet = 0;
		});
	},
	unmounted() {
		window.removeEventListener("scroll", this.handleScroll);
	},
	methods: {
		init() {
			if (this.myUserId !== this.userId)
				this.getBasicUser(this.userId).then(user => {
					if (user && user.username) this.username = user.username;
				});

			this.socket.dispatch("activities.length", this.userId, res => {
				if (res.status === "success") {
					this.maxPosition = Math.ceil(res.data.length / 15) + 1;
					this.getSet();
				}
			});
		},
		hideActivity(activityId) {
			this.socket.dispatch("activities.hideActivity", activityId, res => {
				if (res.status !== "success") new Toast(res.message);
			});
		},
		getSet() {
			if (this.isGettingSet) return;
			if (this.position >= this.maxPosition) return;

			this.isGettingSet = true;

			this.socket.dispatch(
				"activities.getSet",
				this.userId,
				this.position,
				this.offsettedFromNextSet,
				res => {
					if (res.status === "success") {
						this.activities.push(...res.data.activities);
						this.position += 1;
					}

					this.isGettingSet = false;
				}
			);
		},
		handleScroll() {
			const scrollPosition = document.body.clientHeight + window.scrollY;
			const bottomPosition = document.body.scrollHeight;

			if (scrollPosition + 400 >= bottomPosition) this.getSet();

			return this.maxPosition === this.position;
		},
		...mapActions("user/auth", ["getBasicUser"])
	}
};
</script>

<style lang="less" scoped>
.night-mode #activity-items .activity-item {
	background-color: var(--dark-grey-2) !important;
	border: 0 !important;
}

.content a {
	border-bottom: 0;
}
</style>
