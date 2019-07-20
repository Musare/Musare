<template>
  <modal title="Add Song To Queue">
    <div slot="body">
      <aside class="menu" v-if="$parent.$parent.loggedIn && $parent.type === 'community'">
        <ul class="menu-list">
          <li v-for="(playlist, index) in playlists" :key="index">
            <a
              href="#"
              target="_blank"
              v-on:click="$parent.editPlaylist(playlist._id)"
            >{{ playlist.displayName }}</a>
            <div class="controls">
              <a
                href="#"
                v-on:click="selectPlaylist(playlist._id)"
                v-if="!isPlaylistSelected(playlist._id)"
              >
                <i class="material-icons">panorama_fish_eye</i>
              </a>
              <a href="#" v-on:click="unSelectPlaylist()" v-if="isPlaylistSelected(playlist._id)">
                <i class="material-icons">lens</i>
              </a>
            </div>
          </li>
        </ul>
        <br />
      </aside>
      <div class="control is-grouped">
        <p class="control is-expanded">
          <input
            class="input"
            type="text"
            placeholder="YouTube Query"
            v-model="querySearch"
            autofocus
            @keyup.enter="submitQuery()"
          />
        </p>
        <p class="control">
          <a class="button is-info" v-on:click="submitQuery()" href="#">Search</a>
        </p>
      </div>
      <div class="control is-grouped">
        <p class="control is-expanded">
          <input
            class="input"
            type="text"
            placeholder="YouTube Playlist URL"
            v-model="importQuery"
            @keyup.enter="importPlaylist()"
          />
        </p>
        <p class="control">
          <a class="button is-info" v-on:click="importPlaylist()" href="#">Import</a>
        </p>
      </div>
      <table class="table">
        <tbody>
          <tr v-for="(result, index) in queryResults" :key="index">
            <td>
              <img :src="result.thumbnail" />
            </td>
            <td>{{ result.title }}</td>
            <td>
              <a class="button is-success" v-on:click="addSongToQueue(result.id)" href="#">Add</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </modal>
</template>

<script>
import { Toast } from "vue-roaster";
import Modal from "./Modal.vue";
import io from "../../io";
import auth from "../../auth";

export default {
  data() {
    return {
      querySearch: "",
      queryResults: [],
      playlists: [],
      privatePlaylistQueueSelected: null,
      importQuery: "",
    };
  },
  methods: {
    isPlaylistSelected: function(playlistId) {
      return this.privatePlaylistQueueSelected === playlistId;
    },
    selectPlaylist: function(playlistId) {
      let _this = this;
      if (_this.$parent.type === "community") {
        _this.privatePlaylistQueueSelected = playlistId;
        _this.$parent.privatePlaylistQueueSelected = playlistId;
        _this.$parent.addFirstPrivatePlaylistSongToQueue();
      }
    },
    unSelectPlaylist: function() {
      let _this = this;
      if (_this.$parent.type === "community") {
        _this.privatePlaylistQueueSelected = null;
        _this.$parent.privatePlaylistQueueSelected = null;
      }
    },
    addSongToQueue: function(songId) {
      let _this = this;
      if (_this.$parent.type === "community") {
        _this.socket.emit(
          "stations.addToQueue",
          _this.$parent.station._id,
          songId,
          data => {
            if (data.status !== "success")
              Toast.methods.addToast(`Error: ${data.message}`, 8000);
            else Toast.methods.addToast(`${data.message}`, 4000);
          }
        );
      } else {
        _this.socket.emit("queueSongs.add", songId, data => {
          if (data.status !== "success")
            Toast.methods.addToast(`Error: ${data.message}`, 8000);
          else Toast.methods.addToast(`${data.message}`, 4000);
        });
      }
    },
    importPlaylist: function() {
      let _this = this;
      Toast.methods.addToast(
        "Starting to import your playlist. This can take some time to do.",
        4000
      );
      this.socket.emit(
        "queueSongs.addSetToQueue",
        _this.importQuery,
        res => {
          Toast.methods.addToast(res.message, 4000);
        }
      );
    },
    submitQuery: function() {
      console.log("submit query");
      let _this = this;
      let query = _this.querySearch;
      if (query.indexOf("&index=") !== -1) {
        query = query.split("&index=");
        query.pop();
        query = query.join("");
      }
      if (query.indexOf("&list=") !== -1) {
        query = query.split("&list=");
        query.pop();
        query = query.join("");
      }
      _this.socket.emit("apis.searchYoutube", query, results => {
        // check for error
        results = results.data;
        _this.queryResults = [];
        for (let i = 0; i < results.items.length; i++) {
          _this.queryResults.push({
            id: results.items[i].id.videoId,
            url: `https://www.youtube.com/watch?v=${this.id}`,
            title: results.items[i].snippet.title,
            thumbnail: results.items[i].snippet.thumbnails.default.url
          });
        }
      });
    }
  },
  mounted: function() {
    let _this = this;
    io.getSocket(socket => {
      _this.socket = socket;
      _this.socket.emit("playlists.indexForUser", res => {
        if (res.status === "success") _this.playlists = res.data;
      });
      _this.privatePlaylistQueueSelected =
        _this.$parent.privatePlaylistQueueSelected;
    });
  },
  events: {
    closeModal: function() {
      this.$parent.modals.addSongToQueue = !this.$parent.modals.addSongToQueue;
    }
  },
  components: { Modal }
};
</script>

<style lang='scss' scoped>
tr td {
  vertical-align: middle;

  img {
    width: 55px;
  }
}
</style>
