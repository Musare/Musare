<template>
	<modal title='Edit News'>
		<div slot='body'>
			<label class='label'>Title</label>
			<p class='control'>
				<input class='input' type='text' placeholder='News Title' v-model='$parent.editing.title' autofocus>
			</p>
			<label class='label'>Description</label>
			<p class='control'>
				<input class='input' type='text' placeholder='News Description' v-model='$parent.editing.description'>
			</p>
			<div class="columns">
				<div class="column">
					<label class='label'>Bugs</label>
					<p class='control has-addons'>
						<input class='input' id='edit-bugs' type='text' placeholder='Bug' v-on:keyup.enter='addChange("bugs")'>
						<a class='button is-info' href='#' v-on:click='addChange("bugs")'>Add</a>
					</p>
					<span class='tag is-info' v-for='(index, bug) in $parent.editing.bugs' track-by='$index'>
						{{ bug }}
						<button class='delete is-info' v-on:click='removeChange("bugs", index)'></button>
					</span>
				</div>
				<div class="column">
					<label class='label'>Features</label>
					<p class='control has-addons'>
						<input class='input' id='edit-features' type='text' placeholder='Feature' v-on:keyup.enter='addChange("features")'>
						<a class='button is-info' href='#' v-on:click='addChange("features")'>Add</a>
					</p>
					<span class='tag is-info' v-for='(index, feature) in $parent.editing.features' track-by='$index'>
						{{ feature }}
						<button class='delete is-info' v-on:click='removeChange("features", index)'></button>
					</span>
				</div>
			</div>

			<div class="columns">
				<div class="column">
					<label class='label'>Improvements</label>
					<p class='control has-addons'>
						<input class='input' id='edit-improvements' type='text' placeholder='Improvement' v-on:keyup.enter='addChange("improvements")'>
						<a class='button is-info' href='#' v-on:click='addChange("improvements")'>Add</a>
					</p>
					<span class='tag is-info' v-for='(index, improvement) in $parent.editing.improvements' track-by='$index'>
						{{ improvement }}
						<button class='delete is-info' v-on:click='removeChange("improvements", index)'></button>
					</span>
				</div>
				<div class="column">
					<label class='label'>Upcoming</label>
					<p class='control has-addons'>
						<input class='input' id='edit-upcoming' type='text' placeholder='Upcoming' v-on:keyup.enter='addChange("upcoming")'>
						<a class='button is-info' href='#' v-on:click='addChange("upcoming")'>Add</a>
					</p>
					<span class='tag is-info' v-for='(index, upcoming) in $parent.editing.upcoming' track-by='$index'>
						{{ upcoming }}
						<button class='delete is-info' v-on:click='removeChange("upcoming", index)'></button>
					</span>
				</div>
			</div>
		</div>
		<div slot='footer'>
			<button class='button is-success' v-on:click='$parent.updateNews(false)'>
				<i class='material-icons save-changes'>done</i>
				<span>&nbsp;Save</span>
			</button>
			<button class='button is-success' v-on:click='$parent.updateNews(true)'>
				<i class='material-icons save-changes'>done</i>
				<span>&nbsp;Save and close</span>
			</button>
			<button class='button is-danger' v-on:click='$parent.toggleModal()'>
				<span>&nbsp;Close</span>
			</button>
		</div>
	</modal>
</template>

<script>
	import { Toast } from 'vue-roaster';

	import Modal from './Modal.vue';

	export default {
		components: { Modal },
		methods: {
			addChange: function (type) {
				let change = $(`#edit-${type}`).val().trim();

				if (this.$parent.editing[type].indexOf(change) !== -1) return Toast.methods.addToast(`Tag already exists`, 3000);

				if (change) this.$parent.editing[type].push(change);
				else Toast.methods.addToast(`${type} cannot be empty`, 3000);
			},
			removeChange: function (type, index) {
				this.$parent.editing[type].splice(index, 1);
			},
		},
		events: {
			closeModal: function() {
				this.$parent.toggleModal();
			}
		}
	}
</script>

<style lang='scss' scoped>
	input[type=range] {
		-webkit-appearance: none;
		width: 100%;
		margin: 7.3px 0;
	}

	input[type=range]:focus {
		outline: none;
	}

	input[type=range]::-webkit-slider-runnable-track {
		width: 100%;
		height: 5.2px;
		cursor: pointer;
		box-shadow: 0;
		background: #c2c0c2;
		border-radius: 0;
		border: 0;
	}

	input[type=range]::-webkit-slider-thumb {
		box-shadow: 0;
		border: 0;
		height: 19px;
		width: 19px;
		border-radius: 15px;
		background: #03a9f4;
		cursor: pointer;
		-webkit-appearance: none;
		margin-top: -6.5px;
	}

	input[type=range]::-moz-range-track {
		width: 100%;
		height: 5.2px;
		cursor: pointer;
		box-shadow: 0;
		background: #c2c0c2;
		border-radius: 0;
		border: 0;
	}

	input[type=range]::-moz-range-thumb {
		box-shadow: 0;
		border: 0;
		height: 19px;
		width: 19px;
		border-radius: 15px;
		background: #03a9f4;
		cursor: pointer;
		-webkit-appearance: none;
		margin-top: -6.5px;
	}

	input[type=range]::-ms-track {
		width: 100%;
		height: 5.2px;
		cursor: pointer;
		box-shadow: 0;
		background: #c2c0c2;
		border-radius: 1.3px;
	}

	input[type=range]::-ms-fill-lower {
		background: #c2c0c2;
		border: 0;
		border-radius: 0;
		box-shadow: 0;
	}

	input[type=range]::-ms-fill-upper {
		background: #c2c0c2;
		border: 0;
		border-radius: 0;
		box-shadow: 0;
	}

	input[type=range]::-ms-thumb {
		box-shadow: 0;
		border: 0;
		height: 15px;
		width: 15px;
		border-radius: 15px;
		background: #03a9f4;
		cursor: pointer;
		-webkit-appearance: none;
		margin-top: 1.5px;
	}

	.controls {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.artist-genres {
		display: flex;
    	justify-content: space-between;
	}

	#volumeSlider { margin-bottom: 15px; }

	.has-text-centered { padding: 10px; }

	.thumbnail-preview {
		display: flex;
		margin: 0 auto 25px auto;
		max-width: 200px;
		width: 100%;
	}

	.modal-card-body, .modal-card-foot { border-top: 0; }

	.label, .checkbox, h5 {
		font-weight: normal;
	}

	.video-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 10px;

		iframe { pointer-events: none; }
	}

	.save-changes { color: #fff; }

	.tag:not(:last-child) { margin-right: 5px; }
</style>
