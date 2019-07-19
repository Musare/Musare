<template>
  <div class="modal is-active">
    <div class="modal-background"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">Register</p>
        <button class="delete" v-on:click="closeCurrentModal()"></button>
      </header>
      <section class="modal-card-body">
        <!-- validation to check if exists http://bulma.io/documentation/elements/form/ -->
        <label class="label">Email</label>
        <p class="control">
          <input
            class="input"
            type="text"
            placeholder="Email..."
            v-model="$parent.register.email"
            autofocus
          />
        </p>
        <label class="label">Username</label>
        <p class="control">
          <input
            class="input"
            type="text"
            placeholder="Username..."
            v-model="$parent.register.username"
          />
        </p>
        <label class="label">Password</label>
        <p class="control">
          <input
            class="input"
            type="password"
            placeholder="Password..."
            v-model="$parent.register.password"
            v-on:keypress="$parent.submitOnEnter(submitModal, $event)"
          />
        </p>
        <div id="recaptcha"></div>
        <p>
          By logging in/registering you agree to our
          <router-link to="/terms">Terms of Service</router-link>and
          <router-link to="/privacy">Privacy Policy</router-link>.
        </p>
      </section>
      <footer class="modal-card-foot">
        <a class="button is-primary" href="#" v-on:click="submitModal()">Submit</a>
        <a
          class="button is-github"
          :href="$parent.serverDomain + '/auth/github/authorize'"
          v-on:click="githubRedirect()"
        >
          <div class="icon">
            <img class="invert" src="/assets/social/github.svg" />
          </div>&nbsp;&nbsp;Register with GitHub
        </a>
      </footer>
    </div>
  </div>
</template>

<script>
import { mapActions } from "vuex";

export default {
  data() {
    return {
      recaptcha: {
        key: ""
      }
    };
  },
  mounted: function() {
    let _this = this;
    lofig.get("recaptcha", obj => {
      _this.recaptcha.key = obj.key;
      _this.recaptcha.id = grecaptcha.render("recaptcha", {
        sitekey: _this.recaptcha.key
      });
    });
  },
  methods: {
    submitModal: function() {
      // this.$dispatch('register', this.recaptcha.id);
      this.toggleModal();
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
  background-color: #028bca !important;
}

.invert {
  filter: brightness(5);
}

#recaptcha {
  padding: 10px 0;
}

a {
  color: #029ce3;
}
</style>
