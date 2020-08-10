import _Vue, { PluginFunction, PluginObject } from 'vue'
import Keycloak from 'keycloak-js'

declare class VueKeyCloakInstance {
  ready: boolean | undefined // Flag indicating whether Keycloak has initialised and is ready
  authenticated: boolean | undefined
  userName: string | undefined // Username from Keycloak. Collected from tokenParsed['preferred_username']
  fullName: string | undefined // Full name from Keycloak. Collected from tokenParsed['name']
  login: Function | undefined // [Keycloak] login function
  loginFn: Function | undefined // Alias for login
  logoutFn: Function | undefined // Keycloak logout function
  createLoginUrl: Function | undefined // Keycloak createLoginUrl function
  createLogoutUrl: Function | undefined // Keycloak createLogoutUrl function
  createRegisterUrl: Function | undefined // Keycloak createRegisterUrl function
  register: Function | undefined // Keycloak register function
  accountManagement: Function | undefined // Keycloak accountManagement function
  createAccountUrl: Function | undefined // Keycloak createAccountUrl function
  loadUserProfile: Function | undefined // Keycloak loadUserProfile function
  loadUserInfo: Function | undefined // Keycloak loadUserInfo function
  subject: string | undefined // The user id
  idToken: string | undefined // The base64 encoded ID token.
  idTokenParsed: object | undefined // The parsed id token as a JavaScript object.
  realmAccess: object | undefined // The realm roles associated with the token.
  resourceAccess: object | undefined // The resource roles associated with the token.
  refreshToken: string | undefined // The base64 encoded refresh token that can be used to retrieve a new token.
  refreshTokenParsed: object | undefined // The parsed refresh token as a JavaScript object.
  timeSkew: number | undefined // The estimated time difference between the browser time and the Keycloak server in seconds. This value is just an estimation, but is accurate enough when determining if a token is expired or not.
  responseMode: string | undefined // Response mode passed in init (default value is fragment).
  responseType: string | undefined // Response type sent to Keycloak with login requests. This is determined based on the flow value used during initialization, but can be overridden by setting this value.
  hasRealmRole: Function | undefined // Keycloak hasRealmRole function
  hasResourceRole: Function | undefined // Keycloak hasResourceRole function
  token: string | undefined // The base64 encoded token that can be sent in the Authorization header in requests to services
  tokenParsed: string | undefined // The parsed token as a JavaScript object
}

declare type VueKeyCloakOptions = {
  config?: {
    authUrl?: string
    authRealm?: string
    authClientId?: string
    logoutRedirectUri?: string
  };
  init?: {
    onLoad: string
  };
  onReady(keycloak: VueKeyCloakInstance): void;
}

export function VueKeyCloak(Vue: typeof _Vue, options?: VueKeyCloakOptions): void {
  let defaultParams = {
    config: '/config',
    init: { onLoad: 'login-required' }
  }
  const options2 = Object.assign({}, defaultParams, options)
  if (assertOptions(options2).hasError) throw new Error(`Invalid options given: ${assertOptions(options2).error}`)

  const watch = new Vue({
    data() {
      return {
        ready: false,
        authenticated: false,
        userName: null,
        fullName: null,
        token: null,
        tokenParsed: null,
        logoutFn: null,
        loginFn: null,
        login: null,
        createLoginUrl: null,
        createLogoutUrl: null,
        createRegisterUrl: null,
        register: null,
        accountManagement: null,
        createAccountUrl: null,
        loadUserProfile: null,
        loadUserInfo: null,
        subject: null,
        idToken: null,
        idTokenParsed: null,
        realmAccess: null,
        resourceAccess: null,
        refreshToken: null,
        refreshTokenParsed: null,
        timeSkew: null,
        responseMode: null,
        responseType: null,
        hasRealmRole: null,
        hasResourceRole: null
      }
    }
  })
  getConfig(options2.config)
    .then(config => {
      init(config, watch, options2)
      Object.defineProperty(Vue.prototype, '$keycloak', {
        get() {
          return watch
        }
      })
    })
    .catch(err => {
      console.log(err)
    })
}

function init(config: any, watch: any, options: any) {
  const ctor = sanitizeConfig(config)
  const keycloak = Keycloak(ctor)

  watch.$once('ready', function(cb: any) {
    cb && cb()
  })

  keycloak.onReady = function(authenticated) {
    updateWatchVariables(authenticated)
    watch.ready = true
    typeof options.onReady === 'function' && watch.$emit('ready', options.onReady.bind(this, keycloak))
  }
  keycloak.onAuthSuccess = function() {
    // Check token validity every 10 seconds (10 000 ms) and, if necessary, update the token.
    // Refresh token if it's valid for less then 60 seconds
    const updateTokenInterval = setInterval(() => keycloak.updateToken(60).catch(() => {
      keycloak.clearToken()
    }), 10000)
    watch.logoutFn = () => {
      clearInterval(updateTokenInterval)
      keycloak.logout(options.logout || { 'redirectUri': config['logoutRedirectUri'] })
    }
  }
  keycloak.onAuthRefreshSuccess = function() {
    updateWatchVariables(true)
  }
  keycloak.init(options.init)
    .catch(err => {
      typeof options.onInitError === 'function' && options.onInitError(err)
    })

  function updateWatchVariables(isAuthenticated = false) {
    watch.authenticated = isAuthenticated
    watch.loginFn = keycloak.login
    watch.login = keycloak.login
    watch.createLoginUrl = keycloak.createLoginUrl
    watch.createLogoutUrl = keycloak.createLogoutUrl
    watch.createRegisterUrl = keycloak.createRegisterUrl
    watch.register = keycloak.register
    if (isAuthenticated) {
      watch.accountManagement = keycloak.accountManagement
      watch.createAccountUrl = keycloak.createAccountUrl
      watch.hasRealmRole = keycloak.hasRealmRole
      watch.hasResourceRole = keycloak.hasResourceRole
      watch.loadUserProfile = keycloak.loadUserProfile
      watch.loadUserInfo = keycloak.loadUserInfo
      watch.token = keycloak.token
      watch.subject = keycloak.subject
      watch.idToken = keycloak.idToken
      watch.idTokenParsed = keycloak.idTokenParsed
      watch.realmAccess = keycloak.realmAccess
      watch.resourceAccess = keycloak.resourceAccess
      watch.refreshToken = keycloak.refreshToken
      watch.refreshTokenParsed = keycloak.refreshTokenParsed
      watch.timeSkew = keycloak.timeSkew
      watch.responseMode = keycloak.responseMode
      watch.responseType = keycloak.responseType
      watch.tokenParsed = keycloak.tokenParsed
      watch.userName = keycloak.tokenParsed ? keycloak.tokenParsed : ['preferred_username']
      watch.fullName = keycloak.tokenParsed ? keycloak.tokenParsed : ['name']
    }
  }
}

function assertOptions(options: any) {
  const { config, init, onReady, onInitError } = options
  if (typeof config !== 'string' && !_isObject(config)) {
    return { hasError: true, error: `'config' option must be a string or an object. Found: '${config}'` }
  }
  if (!_isObject(init) || typeof init.onLoad !== 'string') {
    return { hasError: true, error: `'init' option must be an object with an 'onLoad' property. Found: '${init}'` }
  }
  if (onReady && typeof onReady !== 'function') {
    return { hasError: true, error: `'onReady' option must be a function. Found: '${onReady}'` }
  }
  if (onInitError && typeof onInitError !== 'function') {
    return { hasError: true, error: `'onInitError' option must be a function. Found: '${onInitError}'` }
  }
  return {
    hasError: false,
    error: null
  }
}

function _isObject(obj: any) {
  return obj !== null && typeof obj === 'object' && Object.prototype.toString.call(obj) !== '[object Array]'
}

function getConfig(config: any) {
  if (_isObject(config)) return Promise.resolve(config)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', config)
    xhr.setRequestHeader('Accept', 'application/json')
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          reject(Error(xhr.statusText))
        }
      }
    }
    xhr.send()
  })
}

function sanitizeConfig(config: any) {
  const renameProp = (oldProp: any, newProp: any, { [oldProp]: old, ...others }) => {
    return {
      [newProp]: old,
      ...others
    }
  }
  return Object.keys(config).reduce(function(previous, key) {
    if (['authRealm', 'authUrl', 'authClientId'].includes(key)) {
      const cleaned = key.replace('auth', '')
      const newKey = cleaned.charAt(0).toLowerCase() + cleaned.slice(1)
      return renameProp(key, newKey, previous)
    }
    return previous
  }, config)
}
