<script setup lang="ts">
import { defineAsyncComponent, ref, onMounted, onUnmounted } from "vue";
import Toast from "toasters";
import { storeToRefs } from "pinia";
import { useWebsocketsStore } from "@/stores/websockets";
import { useUserAuthStore } from "@/stores/userAuth";

const ActivityItem = defineAsyncComponent(
	() => import("@/components/ActivityItem.vue")
);
const QuickConfirm = defineAsyncComponent(
	() => import("@/components/QuickConfirm.vue")
);

const { socket } = useWebsocketsStore();

const props = defineProps({
	userId: {
		type: String,
		default: ""
	},
	checkScroll: {
		type: Boolean,
		default: false
	}
});

const username = ref("");
const activities = ref([]);
const position = ref(1);
const maxPosition = ref(1);
const offsettedFromNextSet = ref(0);
const isGettingSet = ref(false);

const userAuthStore = useUserAuthStore();
const { currentUser } = storeToRefs(userAuthStore);
const { getBasicUser } = userAuthStore;

const hideActivity = activityId => {
	socket.dispatch("activities.hideActivity", activityId, res => {
		if (res.status !== "success") new Toast(res.message);
	});
};

const getSet = () => {
	if (isGettingSet.value) return;
	if (position.value >= maxPosition.value) return;

	isGettingSet.value = true;

	socket.dispatch(
		"activities.getSet",
		props.userId,
		position.value,
		offsettedFromNextSet.value,
		res => {
			if (res.status === "success") {
				activities.value.push(...res.data.activities);
				position.value += 1;
			}

			isGettingSet.value = false;
		}
	);
};

const handleScroll = () => {
	if (!props.checkScroll) return false;

	const scrollPosition = document.body.scrollTop + document.body.clientHeight;
	const bottomPosition = document.body.scrollHeight;

	if (scrollPosition + 400 >= bottomPosition) getSet();

	return maxPosition.value === position.value;
};

onMounted(() => {
	document.body.addEventListener("scroll", handleScroll);

	socket.onConnect(() => {
		if (currentUser.value?._id !== props.userId)
			getBasicUser(props.userId).then(user => {
				if (user && user.username) username.value = user.username;
			});

		socket.dispatch("activities.length", props.userId, res => {
			if (res.status === "success") {
				maxPosition.value = Math.ceil(res.data.length / 15) + 1;
				getSet();
			}
		});
	});

	socket.on("event:activity.updated", res => {
		activities.value.find(
			activity => activity._id === res.data.activityId
		).payload.message = res.data.message;
	});

	socket.on("event:activity.created", res => {
		activities.value.unshift(res.data.activity);
		offsettedFromNextSet.value += 1;
	});

	socket.on("event:activity.hidden", res => {
		activities.value = activities.value.filter(
			activity => activity._id !== res.data.activityId
		);

		offsettedFromNextSet.value -= 1;
	});

	socket.on("event:activity.removeAllForUser", () => {
		activities.value = [];
		position.value = 1;
		maxPosition.value = 1;
		offsettedFromNextSet.value = 0;
	});
});

onUnmounted(() => {
	document.body.removeEventListener("scroll", handleScroll);
});
</script>

<template>
	<div class="content recent-activity-tab">
		<div v-if="activities.length > 0">
			<h4 class="section-title">Recent activity</h4>

			<p class="section-description">
				This is a log of all actions
				{{
					userId === currentUser?._id ? "you have" : `${username} has`
				}}
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
							v-if="userId === currentUser?._id"
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

<style lang="less" scoped>
.night-mode #activity-items .activity-item {
	background-color: var(--dark-grey-2) !important;
	border: 0 !important;
}

.content a {
	border-bottom: 0;
}
</style>
