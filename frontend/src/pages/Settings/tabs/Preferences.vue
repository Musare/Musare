<template>
	<div class="content preferences-tab">
		<p class="control is-expanded checkbox-control">
			<input type="checkbox" id="nightmode" v-model="localNightmode" />
			<label for="nightmode">
				<span></span>
				<p>Use nightmode</p>
			</label>
		</p>
		<button class="button is-primary save-changes" @click="saveChanges()">
			Save changes
		</button>
	</div>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
	data() {
		return {
			localNightmode: false
		};
	},
	computed: mapState({
		nightmode: state => state.user.preferences.nightmode
	}),
	methods: {
		saveChanges() {
			if (this.localNightmode !== this.nightmode)
				this.changeNightmodeLocal();
		},
		changeNightmodeLocal() {
			localStorage.setItem("nightmode", this.localNightmode);
			this.changeNightmode(this.localNightmode);
		},
		...mapActions("user/preferences", ["changeNightmode"])
	}
};
</script>

<style lang="scss" scoped>
@import "../../../styles/global.scss";

.checkbox-control {
	input[type="checkbox"] {
		opacity: 0;
		position: absolute;
	}

	label {
		display: flex;
		flex-direction: row;
		align-items: center;

		span {
			cursor: pointer;
			width: 24px;
			height: 24px;
			background-color: $white;
			display: inline-block;
			border: 1px solid $dark-grey-2;
			position: relative;
			border-radius: 3px;
		}

		p {
			margin-left: 10px;
		}
	}

	input[type="checkbox"]:checked + label span::after {
		content: "";
		width: 18px;
		height: 18px;
		left: 2px;
		top: 2px;
		border-radius: 3px;
		background-color: $musare-blue;
		position: absolute;
	}
}
</style>
