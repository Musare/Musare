<template>
	<div class="modal is-active">
		<div class="modal-background"></div>
		<div class="modal-card">
			<header class="modal-card-head">
				<p class="modal-card-title">Add Songs to Station</p>
				<button class="delete" @click="$parent.toggleModal()" ></button>
			</header>
			<section class="modal-card-body">
				<div class="control is-grouped">
					<p class="control is-expanded">
						<input class="input" type="text" placeholder="YouTube Query" v-model="$parent.querySearch">
					</p>
					<p class="control">
						<a class="button is-info" @click="$parent.submitQuery()">
							Search
						</a>
					</p>
				</div>
				<table class="table">
					<tbody>
						<tr v-for="result in $parent.queryResults">
							<td>
								<img :src="result.thumbnail" />
							</td>
							<td>{{ result.title }}</td>
							<td>
								<a class="button is-success" @click="$parent.addSongToQueue(result.id)">
									Add
								</a>
							</td>
						</tr>
					</tbody>
				</table>
			</section>
		</div>
	</div>
</template>