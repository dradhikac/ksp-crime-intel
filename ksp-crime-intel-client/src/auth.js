export function checkAuth() {
  return new Promise((resolve) => {
    if (!window.catalyst || !window.catalyst.auth) {
      resolve(null);
      return;
    }
    window.catalyst.auth.isUserAuthenticated()
      .then((response) => resolve(response.content))
      .catch(() => resolve(null));
  });
}

export function logout() {
  return new Promise((resolve) => {
    const finish = () => {
      document.cookie.split(';').forEach(c => {
        document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
      });
      resolve();
    };
    if (!window.catalyst || !window.catalyst.auth) {
      finish();
      return;
    }
    window.catalyst.auth.signOut().then(finish).catch(finish);
  });

}

