<template>
	<div class="item activity-item universal-item">
		<div class="thumbnail">
			<img :src="activity.thumbnail" :alt="activity.message" />
			<i class="material-icons activity-type-icon">{{ activity.icon }}</i>
		</div>
		<div class="left-part">
			<p class="item-title">
				{{ activity.activityType }}
				<!-- v-html="activity.message" -->
			</p>
			<p class="item-description">
				{{
					formatDistance(parseISO(activity.createdAt), new Date(), {
						addSuffix: true
					})
				}}
			</p>
		</div>
		<div class="universal-item-actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<script>
import { formatDistance, parseISO } from "date-fns";

export default {
	props: {
		activity: {
			type: Object,
			default: () => {}
		}
	},
	methods: { formatDistance, parseISO }
};
</script>

<style lang="scss" scoped>
@import "../../styles/global.scss";

.night-mode {
}

.activity-item {
	height: 72px;
	border: 0.5px $light-grey-2 solid;
	border-radius: 3px;

	.thumbnail {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 70.5px;
		height: 70.5px;

		img {
			opacity: 0.4;
		}

		.activity-type-icon {
			position: absolute;
			color: $dark-grey;
			font-size: 30px;
		}
	}

	.left-part {
		flex: 1;
		padding: 12px;

		.item-title {
			margin: 0;
		}
	}

	.universal-item-actions a {
		border-bottom: 0;
	}
}
</style>
