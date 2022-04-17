<template>
  <div id="app">
    <header>
      <div class="header_wrapper">
        <div class="header_logo-container">
          <a class="header_logo" href="/">
            <img src="/favicon.ico"/>
          </a>
        </div>
        <nav class="header_bar">
          <ul class="header_bar_menu">
            <li v-for="(item,key) in header_menu"
                :key="key"
                class="header_bar_menu_item">
              <a :href="item.to">{{ item.name }}</a>
            </li>
          </ul>
        </nav>
      </div>
      <nav class="header-drawer"></nav>
    </header>
    <main>
      <router-view></router-view>
    </main>
    <footer></footer>
  </div>
</template>

<script>


export default {
  name: "App",
  data() {
    return {
      header_menu: [
        {
          name: "FA",
          to: "/"
        }, {
          name: "Nothing",
          to: "//google.com"
        }
      ]
    }
  },
  methods: {}
}
</script>

<style lang="scss">
body{
  margin: 0;
}
#app {
  font-family: Roboto,Helvetica,Arial,sans-serif;;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  //color: #2c3e50;
  //background-color: #eff7cf;
}
.header_wrapper {
  a {
    text-decoration: none;
    color: #000;
  }

  position: relative;
  width: 80%;
  height: 70px;
  display: inline-flex;
  align-items: center;

  .header_logo-container {
    display: inline;
  }

  .header_bar {
    position: absolute;
    padding: 0;
    right: 70px;
    width: auto;
    height: 100%;
    transition: opacity .2s ease-out .3s, visibility .2s ease-out .3s;

    .header_bar_menu {
      display: inline-flex;
      align-items: center;
      padding: 0;
      height: 100%;
      margin-block-start: 0;
      margin-block-end: 0;
      list-style: none; //去除圆点
      .header_bar_menu_item {
        //display: inline; //横向并排
        margin-right: 10px;
      }
    }
  }

}
</style>
