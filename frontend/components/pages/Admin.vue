<template>
  <div class="app">
    <main-header></main-header>
    <div class="tabs is-centered">
      <ul>
        <li :class="{ 'is-active': currentTab == 'queueSongs' }" v-on:click="showTab('queueSongs')">
          <router-link to="/admin/queuesongs">
            <i class="material-icons">queue_music</i>
            <span>&nbsp;Queue Songs</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'songs' }" v-on:click="showTab('songs')">
          <router-link to="/admin/songs">
            <i class="material-icons">music_note</i>
            <span>&nbsp;Songs</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'stations' }" v-on:click="showTab('stations')">
          <router-link to="/admin/stations">
            <i class="material-icons">hearing</i>
            <span>&nbsp;Stations</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'reports' }" v-on:click="showTab('reports')">
          <router-link to="/admin/reports">
            <i class="material-icons">report_problem</i>
            <span>&nbsp;Reports</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'news' }" v-on:click="showTab('news')">
          <router-link to="/admin/news">
            <i class="material-icons">chrome_reader_mode</i>
            <span>&nbsp;News</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'users' }" v-on:click="showTab('users')">
          <router-link to="/admin/users">
            <i class="material-icons">person</i>
            <span>&nbsp;Users</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'statistics' }" v-on:click="showTab('statistics')">
          <router-link to="/admin/statistics">
            <i class="material-icons">show_chart</i>
            <span>&nbsp;Statistics</span>
          </router-link>
        </li>
        <li :class="{ 'is-active': currentTab == 'punishments' }" v-on:click="showTab('punishments')">
          <router-link to="/admin/punishments">
            <i class="material-icons">gavel</i>
            <span>&nbsp;Punishments</span>
          </router-link>
        </li>
      </ul>
    </div>

    <queue-songs v-if="currentTab == 'queueSongs'"></queue-songs>
    <songs v-if="currentTab == 'songs'"></songs>
    <stations v-if="currentTab == 'stations'"></stations>
    <reports v-if="currentTab == 'reports'"></reports>
    <news v-if="currentTab == 'news'"></news>
    <users v-if="currentTab == 'users'"></users>
    <statistics v-if="currentTab == 'statistics'"></statistics>
    <punishments v-if="currentTab == 'punishments'"></punishments>
  </div>
</template>

<script>
import MainHeader from "../MainHeader.vue";
import MainFooter from "../MainFooter.vue";

import QueueSongs from "../Admin/QueueSongs.vue";
import Songs from "../Admin/Songs.vue";
import Stations from "../Admin/Stations.vue";
import Reports from "../Admin/Reports.vue";
import News from "../Admin/News.vue";
import Users from "../Admin/Users.vue";
import Statistics from "../Admin/Statistics.vue";
import Punishments from "../Admin/Punishments.vue";

export default {
  components: {
    MainHeader,
    MainFooter,
    QueueSongs,
    Songs,
    Stations,
    Reports,
    News,
    Users,
    Statistics,
    Punishments
  },
  mounted() {
    switch (window.location.pathname) {
      case "/admin/queuesongs":
        this.currentTab = "queueSongs";
        break;
      case "/admin/songs":
        this.currentTab = "songs";
        break;
      case "/admin/stations":
        this.currentTab = "stations";
        break;
      case "/admin/reports":
        this.currentTab = "reports";
        break;
      case "/admin/news":
        this.currentTab = "news";
        break;
      case "/admin/users":
        this.currentTab = "users";
        break;
      case "/admin/statistics":
        this.currentTab = "statistics";
        break;
      case "/admin/punishments":
        this.currentTab = "punishments";
        break;
      default:
        this.currentTab = "queueSongs";
    }
  },
  data() {
    return {
      currentTab: "queueSongs"
    };
  },
  methods: {
    showTab: function(tab) {
      this.currentTab = tab;
    }
  }
};
</script>

<style lang='scss' scoped>
.is-active a {
  color: #03a9f4 !important;
  border-color: #03a9f4 !important;
}
</style>
