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
			<h2
				class="item-title"
				:title="`Reported by ${
					createdBy.username ? createdBy.username : 'Deleted User'
				}`"
			>
				Reported by
				<router-link
					v-if="createdBy.username"
					:to="{
						path: `/u/${createdBy.username}`
					}"
					:title="createdBy._id"
					@click="closeModal('viewReport')"
				>
					{{ createdBy.username }}
				</router-link>
				<span v-else :title="createdBy._id">Deleted User</span>
			</h2>
			<h5 class="item-description">
				{{
					formatDistance(new Date(createdAt), new Date(), {
						addSuffix: true
					})
				}}
			</h5>
		</div>

		<div class="universal-item-actions">
			<slot name="actions" />
		</div>
	</div>
</template>

<script>
import { mapActions } from "vuex";
import { formatDistance } from "date-fns";

import ProfilePicture from "@/components/ProfilePicture.vue";

export default {
	components: { ProfilePicture },
	props: {
		createdBy: { type: Object, default: () => {} },
		createdAt: { type: String, default: "" }
	},
	methods: {
		formatDistance,
		...mapActions("modalVisibility", ["closeModal"])
	}
};
</script>

<style lang="less" scoped>
.night-mode {
	.report-info-item {
		background-color: var(--dark-grey) !important;
		border: 0 !important;
	}
}

.report-info-item {
	.item-icon {
		min-width: 45px;
		max-width: 45px;
		height: 45px;
		margin-right: 10px;

		/deep/ .profile-picture.using-initials span {
			font-size: calc(
				45px / 5 * 2
			); // 2/5th of .profile-picture height/width
		}

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

	.item-title-description {
		min-width: 0;
	}

	.item-title {
		font-size: 14px;
		margin: 0;
	}

	.item-description {
		font-size: 12px;
		line-height: 14px;
		text-transform: capitalize;
		margin: 0;
	}
}
</style>
