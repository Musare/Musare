<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Login</p>
        <button class="delete" v-on:click="closeCurrentModal()"></button>
      </header>
      <section class="modal-card-body">
        <!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
        <label class="label">Email</label>
        <p class="control">
          <input class="input" type="text" placeholder="Email..." v-model="$parent.login.email" />
        </p>
        <label class="label">Password</label>
        <p class="control">
          <input
            class="input"
            type="password"
            placeholder="Password..."
            v-model="$parent.login.password"
            v-on:keypress="$parent.submitOnEnter(submitModal, $event)"
          />
        </p>
        <p>
          By logging in/registering you agree to our
          <router-link to="/terms">Terms of Service</router-link>and&nbsp;
          <router-link to="/privacy">Privacy Policy</router-link>.
        </p>
      </section>
      <footer class="modal-card-foot">
        <a class="button is-primary" href="#" v-on:click="submitModal('login')">Submit</a>
        <a
          class="button is-github"
          :href="$parent.serverDomain + '/auth/github/authorize'"
          v-on:click="githubRedirect()"
        >
          <div class="icon">
            <img class="invert" src="/assets/social/github.svg" />
          </div>&nbsp;&nbsp;Login with GitHub
        </a>
        <a href="/reset_password" v-on:click="resetPassword()">Forgot password?</a>
      </footer>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  methods: {
    submitModal: function() {
      // this.$dispatch('login');
      //this.toggleModal();
    },
    resetPassword: function() {
      this.$router.go("/reset_password");
      //this.toggleModal();
    },
    githubRedirect: function() {
      localStorage.setItem("github_redirect", this.$route.path);
    },
    ...mapActions("modals", ["toggleModal", "closeCurrentModal"])
  }
};
</script>

<style lang='scss' scoped>
.button.is-github {
  background-color: #333;
  color: #fff !important;
}

.is-github:focus {
  background-color: #1a1a1a;
}
.is-primary:focus {
  background-color: #029ce3 !important;
}

.invert {
  filter: brightness(5);
}

a {
  color: #029ce3;
}
</style>
