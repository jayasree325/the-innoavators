/**
 * auth.js — Auth Management
 */

const Auth = (() => {
  const CURRENT_USER_KEY = 'ling_current_user';
  
  function isLoggedIn() {
    return !!localStorage.getItem(CURRENT_USER_KEY);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(CURRENT_USER_KEY));
    } catch {
      return null;
    }
  }

  function login(email, password) {
    if (!email || !password) throw new Error('Email and password required');
    // Fake login
    const user = { id: 1, email, name: email.split('@')[0] };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = 'index.html';
  }

  function requireAuth() {
    if (!isLoggedIn() && !window.location.pathname.includes('login.html') && !window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      window.location.href = 'login.html';
    }
  }

  return { isLoggedIn, getUser, login, logout, requireAuth };
})();

window.Auth = Auth;
