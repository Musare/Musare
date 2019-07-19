<template>
  <nav class="nav is-info">
    <div class="nav-left">
      <router-link class="nav-item is-brand" to="/">Musare</router-link>
    </div>

    <span class="nav-toggle" :class="{ 'is-active': isMobile }" v-on:click="isMobile = !isMobile">
      <span></span>
      <span></span>
      <span></span>
    </span>

    <div class="nav-right nav-menu" :class="{ 'is-active': isMobile }">
      <router-link
        class="nav-item is-tab admin"
        to="/admin"
        v-if="$parent.$parent.role === 'admin'"
      >
        <strong>Admin</strong>
      </router-link>
      <router-link class="nav-item is-tab admin" to="/team">Team</router-link>
      <router-link class="nav-item is-tab admin" to="/about">About</router-link>
      <router-link class="nav-item is-tab admin" to="/news">News</router-link>
      <span class="grouped" v-if="$parent.$parent.loggedIn">
        <router-link
          class="nav-item is-tab admin"
          :to="{ name: 'profile', params: { username: $parent.$parent.username } }"
        >Profile</router-link>
        <router-link class="nav-item is-tab admin" to="/settings">Settings</router-link>
        <a class="nav-item is-tab" href="#" v-on:click="$parent.$parent.logout()">Logout</a>
      </span>
      <span class="grouped" v-else>
        <a
          class="nav-item"
          href="#"
          v-on:click="toggleModal({
            sector: 'header',
            modal: 'login'
          })"
        >Login</a>
        <a
          class="nav-item"
          href="#"
          v-on:click="toggleModal({
            sector: 'header',
            modal: 'register'
          })"
        >Register</a>
      </span>
    </div>
  </nav>
</template>

<script>
import { mapState, mapActions } from "vuex";

export default {
  data() {
    return {
      isMobile: false
    };
  },
  computed: mapState("modals", {
    modals: state => state.modals.header
  }),
  methods: {
    ...mapActions("modals", ["toggleModal"])
  }
};
</script>

<style lang="scss" scoped>
.nav {
  background-color: #03a9f4;
  height: 64px;

  .nav-menu.is-active {
    .nav-item {
      color: #333;

      &:hover {
        color: #333;
      }
    }
  }

  .nav-toggle {
    height: 64px;

    &.is-active span {
      background-color: #333;
    }
  }

  .is-brand {
    font-size: 2.1rem !important;
    line-height: 64px !important;
    padding: 0 20px;
  }

  .nav-item {
    font-size: 15px;
    color: hsl(0, 0%, 100%);

    &:hover {
      color: hsl(0, 0%, 100%);
    }
  }
  .admin {
    color: #424242;
  }
}
.grouped {
  margin: 0;
  display: flex;
  text-decoration: none;
}
.nightMode {
  .nav {
    background-color: #012332;
    height: 64px;

    .nav-menu.is-active {
      .nav-item {
        color: #333;

        &:hover {
          color: #333;
        }
      }
    }

    .nav-toggle {
      height: 64px;

      &.is-active span {
        background-color: #333;
      }
    }

    .is-brand {
      font-size: 2.1rem !important;
      line-height: 64px !important;
      padding: 0 20px;
    }

    .nav-item {
      font-size: 15px;
      color: hsl(0, 0%, 100%);

      &:hover {
        color: hsl(0, 0%, 100%);
      }
    }
    .admin strong {
      color: #03a9f4;
    }
  }
}
</style>
