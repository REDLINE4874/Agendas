const siteAuthConfig = window.SUPABASE_CONFIG || {};
const siteAuthReady = Boolean(
  window.supabase?.createClient
  && siteAuthConfig.url
  && siteAuthConfig.anonKey
  && !siteAuthConfig.url.includes("TU-PROYECTO")
  && !siteAuthConfig.anonKey.includes("TU-ANON-KEY"),
);

const siteAuthScreen = document.createElement("section");
siteAuthScreen.className = "site-auth-screen";
siteAuthScreen.id = "siteAuthScreen";
siteAuthScreen.setAttribute("aria-labelledby", "siteAuthTitle");
siteAuthScreen.innerHTML = `
  <div class="site-auth-card">
    <img class="site-auth-logo" src="assets/icons/talent.svg" alt="Agenda de prospectos" />
    <h1 id="siteAuthTitle">Iniciar sesión</h1>
    <p class="site-auth-page-name">AGENDAS</p>
    <div id="siteAuthLoginPanel">
      <form class="site-auth-form" id="siteAuthLoginForm" autocomplete="off">
        <label>Usuario<input id="siteAuthLoginUsername" type="text" autocomplete="username" minlength="3" required /></label>
        <label>Contraseña<input id="siteAuthLoginPassword" type="password" autocomplete="current-password" required /></label>
        <button class="site-auth-submit" type="submit">Iniciar sesión</button>
      </form>
      <button class="site-auth-link" id="siteAuthForgot" type="button">Olvidé mi contraseña</button>
    </div>
    <div id="siteAuthRequestPanel" hidden>
      <p>Escribe tu correo y te enviaremos un enlace para cambiar la contraseña.</p>
      <form class="site-auth-form" id="siteAuthRequestForm" autocomplete="off">
        <label>Correo electrónico<input id="siteAuthRequestEmail" type="email" autocomplete="email" required /></label>
        <button class="site-auth-submit" type="submit">Enviar enlace</button>
      </form>
      <button class="site-auth-link" id="siteAuthRequestBack" type="button">Volver al inicio de sesión</button>
    </div>
    <div id="siteAuthUpdatePanel" hidden>
      <p>Escribe y confirma tu nueva contraseña.</p>
      <form class="site-auth-form" id="siteAuthUpdateForm" autocomplete="off">
        <label>Contraseña nueva<input id="siteAuthNewPassword" type="password" autocomplete="new-password" required /></label>
        <label>Confirmar contraseña<input id="siteAuthConfirmPassword" type="password" autocomplete="new-password" required /></label>
        <button class="site-auth-submit" type="submit">Guardar contraseña</button>
      </form>
    </div>
    <p class="site-auth-status" id="siteAuthStatus" role="status"></p>
  </div>`;
document.body.prepend(siteAuthScreen);

const byId = (id) => document.getElementById(id);
const loginPanel = byId("siteAuthLoginPanel");
const requestPanel = byId("siteAuthRequestPanel");
const updatePanel = byId("siteAuthUpdatePanel");
const loginForm = byId("siteAuthLoginForm");
const requestForm = byId("siteAuthRequestForm");
const updateForm = byId("siteAuthUpdateForm");
const status = byId("siteAuthStatus");
let recoveryMode = false;
let embeddedMode = false;

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("is-error", isError);
}

function showPanel(panel) {
  loginPanel.hidden = panel !== "login";
  requestPanel.hidden = panel !== "request";
  updatePanel.hidden = panel !== "update";
  byId("siteAuthTitle").textContent = panel === "update"
    ? "Cambiar contraseña" : panel === "request" ? "Recuperar contraseña" : "Iniciar sesión";
  setStatus("");
}

window.bindSiteAuthButton = (signedIn) => {
  const button = byId("authButton");
  const userLabel = byId("current-user");
  if (!button) return;
  const label = signedIn ? "Cerrar sesión" : "Iniciar sesión";
  const icon = signedIn ? "logout" : "login";
  button.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${icon}</span><span class="sr-only">${label}</span>`;
  button.setAttribute("aria-label", label);
  button.title = label;
  if (userLabel && !signedIn) userLabel.textContent = "";
  button.onclick = () => signedIn
    ? window.SUPABASE_AUTH_CLIENT.auth.signOut()
    : showPanel("login");
};

async function mostrarUsuarioActual(user) {
  const userLabel = byId("current-user");
  if (!userLabel) return;
  if (!user) { userLabel.textContent = ""; return; }
  userLabel.textContent = "Usuario: cargando...";
  try {
    const directProfile = await window.SUPABASE_AUTH_CLIENT
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    let username = directProfile.data?.username;
    if (!username) {
      const fallback = await window.SUPABASE_AUTH_CLIENT.schema("agendas").rpc("get_current_username");
      username = Array.isArray(fallback.data) ? fallback.data[0]?.username : fallback.data?.username;
    }
    userLabel.textContent = `Usuario: ${username || "Usuario"}`;
  } catch (error) {
    userLabel.textContent = "Usuario: Usuario";
  }
}

function updateSession(session) {
  const signedIn = Boolean(session?.user);
  document.body.classList.remove("site-auth-pending");
  document.body.classList.toggle("site-auth-required", !signedIn);
  siteAuthScreen.hidden = embeddedMode || (signedIn && !recoveryMode);
  window.bindSiteAuthButton(signedIn);
  mostrarUsuarioActual(session?.user);
  if (!signedIn) showPanel("login");
  if (signedIn && typeof window.cargarLista === "function") window.cargarLista();
}

function listenForHostSession() {
  if (window.parent === window) return;
  window.addEventListener("message", async (event) => {
    if (event.data?.type === "TALENT_ECOSYSTEM_APPEARANCE") {
      document.body.classList.toggle("dark", Boolean(event.data.dark));
      if (event.data.pageBackground) document.body.style.setProperty("--page-background", event.data.pageBackground);
      return;
    }
    if (event.data?.type !== "TALENT_ECOSYSTEM_SESSION") return;
    if (event.data.embedded) {
      embeddedMode = true;
      document.body.classList.add("embedded");
      siteAuthScreen.hidden = true;
    }
    const session = event.data.session;
    if (!session?.access_token || !session?.refresh_token) {
      updateSession(null);
      return;
    }
    const { data: currentSessionData } = await window.SUPABASE_AUTH_CLIENT.auth.getSession();
    const currentSession = currentSessionData?.session;
    if (currentSession?.access_token === session.access_token) {
      updateSession(currentSession);
      return;
    }
    const { error } = await window.SUPABASE_AUTH_CLIENT.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) setStatus("No se pudo sincronizar la sesiÃ³n.", true);
  });
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = loginForm.querySelector("button[type=submit]");
  submit.disabled = true;
  setStatus("Iniciando sesión...");
  const username = byId("siteAuthLoginUsername").value.trim();
  const password = byId("siteAuthLoginPassword").value;
  const { data: email, error: lookupError } = await window.SUPABASE_AUTH_CLIENT.rpc(
    "get_auth_email_by_username", { target_username: username },
  );
  const { error } = lookupError || !email
    ? { error: lookupError || new Error("Usuario no encontrado") }
    : await window.SUPABASE_AUTH_CLIENT.auth.signInWithPassword({ email, password });
  submit.disabled = false;
  if (error) setStatus("Usuario o contraseña incorrectos.", true);
});

requestForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = requestForm.querySelector("button[type=submit]");
  submit.disabled = true;
  const { error } = await window.SUPABASE_AUTH_CLIENT.auth.resetPasswordForEmail(
    byId("siteAuthRequestEmail").value.trim(), { redirectTo: window.location.href.split("#")[0] },
  );
  submit.disabled = false;
  setStatus(error ? error.message : "Revisa tu correo para cambiar la contraseña.", Boolean(error));
  if (!error) requestForm.reset();
});

updateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = byId("siteAuthNewPassword").value;
  if (password !== byId("siteAuthConfirmPassword").value) return setStatus("Las contraseñas no coinciden.", true);
  const submit = updateForm.querySelector("button[type=submit]");
  submit.disabled = true;
  const { error } = await window.SUPABASE_AUTH_CLIENT.auth.updateUser({ password });
  submit.disabled = false;
  if (error) return setStatus(error.message, true);
  recoveryMode = false;
  updateForm.reset();
  setStatus("Contraseña actualizada. Ya puedes continuar.");
  const { data } = await window.SUPABASE_AUTH_CLIENT.auth.getSession();
  updateSession(data?.session);
});

byId("siteAuthForgot").onclick = () => showPanel("request");
byId("siteAuthRequestBack").onclick = () => showPanel("login");

if (!siteAuthReady) {
  document.body.classList.remove("site-auth-pending");
  document.body.classList.add("site-auth-required");
  setStatus("Falta configurar Supabase.", true);
} else {
  window.SUPABASE_AUTH_CLIENT ||= window.supabase.createClient(
    siteAuthConfig.url,
    siteAuthConfig.anonKey,
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "talent-ecosystem-auth" } },
  );
  listenForHostSession();
  window.SUPABASE_AUTH_CLIENT.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY") { recoveryMode = true; showPanel("update"); }
    updateSession(session);
  });
  window.SUPABASE_AUTH_CLIENT.auth.getSession().then(({ data, error }) => {
    if (error) setStatus("No se pudo recuperar la sesión.", true);
    updateSession(data?.session);
  });
}
