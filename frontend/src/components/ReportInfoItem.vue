<template>
	<div class="universal-item report-info-item">
		<div class="item-icon">
			<profile-picture
				:avatar="createdBy.avatar"
				:name="createdBy.name ? createdBy.name : createdBy.username"
				v-if="createdBy.avatar"
			/>
			<i class="material-icons" v-else>person_remove</i>
		</div>

		<div class="item-title-description">
			<p class="item-title">
				Reported by
				<router-link
					v-if="createdBy.username"
					:to="{
						path: `/u/${createdBy.username}`
					}"
					:title="createdBy._id"
				>
					{{ createdBy.username }}
				</router-link>
				<span v-else :title="createdBy._id">Deleted User</span>
			</p>
			<p class="item-description">
				{{
					formatDistance(new Date(createdAt), new Date(), {
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
import { formatDistance } from "date-fns";
import ProfilePicture from "@/components/ProfilePicture.vue";

export default {
	components: { ProfilePicture },
	props: {
		createdBy: { type: Object, default: () => {} },
		createdAt: { type: String, default: "" }
	},
	methods: {
		formatDistance
	}
};
</script>

<style lang="scss" scoped>
.report-info-item {
	.item-icon {
		min-width: 45px;
		max-width: 45px;
		height: 45px;
		margin-right: 10px;

		.profile-picture,
		i {
			width: 45px;
			height: 45px;
		}

		i {
			font-size: 30px;
			display: flex;
			align-items: center;
			justify-content: center;
		}
	}

	.item-title {
		font-size: 14px;
	}

	.item-description {
		font-size: 12px;
	}
}
</style>
