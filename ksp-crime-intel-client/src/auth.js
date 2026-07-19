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
  return window.catalyst.auth.signOut();
}