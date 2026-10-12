/* Authentication + role-based access.
 *
 * Roles
 *   admin     : everything
 *   employee  : superannuating employee (own "My Journey" page + Repository + Ask Smriti)
 *   learner   : every other employee (Repository + Ask Smriti)
 *
 * DEMO PROVIDER ("local"): checks the demo accounts in SEED. This is NOT secure: it runs in the
 * browser, so anyone can read it. It exists to demonstrate the role-based UX.
 *
 * ACTIVE DIRECTORY LATER: implement the same three methods (login / current / logout) in a provider
 * that redirects to your Azure AD / ADFS (OIDC) endpoint and reads the signed ID token's groups,
 * then register it below. The rest of the portal only calls Auth.current() and Auth.can().
 * See README ("Moving to Active Directory").
 */
(function (w) {
  const SKEY = 'smriti_session_v1';
  const Auth = {};

  /** Role rule used by the demo provider AND a good starting point for AD group mapping. */
  Auth.roleForEmployee = (emp) => (U.daysTo(emp.dor) >= 0 ? 'employee' : 'learner');

  const LocalProvider = {
    name: 'local',
    login(username, password) {
      const seed = w.SEED;
      const u = username.trim();
      const demo = seed.demoUsers.find((x) => x.username.toLowerCase() === u.toLowerCase());
      if (demo) {
        if (U.hash(password) !== U.hash(demo.password)) throw new Error('Incorrect user ID or password.');
        return { username: demo.username, name: demo.name, role: demo.role, empId: null };
      }
      const emp = Store.employee(u.toUpperCase());
      if (emp && U.hash(password) === U.hash(seed.employeePassword)) {
        return { username: emp.empId, name: emp.name, role: Auth.roleForEmployee(emp), empId: emp.empId };
      }
      throw new Error('Incorrect user ID or password.');
    },
    current() { try { return JSON.parse(sessionStorage.getItem(SKEY)); } catch (e) { return null; } },
    store(user) { sessionStorage.setItem(SKEY, JSON.stringify(user)); },
    logout() { sessionStorage.removeItem(SKEY); },
  };

  // Swap this line when AD/OIDC is ready:  Auth.provider = OidcProvider;
  Auth.provider = LocalProvider;

  Auth.login = (u, p) => {
    const user = Auth.provider.login(u, p);
    Auth.provider.store(user);
    if (user.empId) { const s = Store.sub(user.empId); if (!s.loggedInAt) { s.loggedInAt = U.todayISO(); Store.save(); } }
    return user;
  };
  Auth.current = () => Auth.provider.current();
  Auth.logout = () => Auth.provider.logout();

  const PERMS = {
    admin: ['repo', 'ask', 'journey', 'admin'],
    employee: ['repo', 'ask', 'journey'],
    learner: ['repo', 'ask'],
  };
  Auth.can = (perm) => { const u = Auth.current(); return !!u && PERMS[u.role].includes(perm); };
  Auth.tabsFor = (role) => ({
    admin: [['admin', 'Dashboard'], ['admin/master', 'Master data'], ['admin/mail', 'Mail centre'], ['admin/submissions', 'Submissions'], ['admin/assets', 'Assets'], ['repo', 'Repository'], ['ask', 'Ask Smriti'], ['admin/settings', 'Settings']],
    employee: [['journey', 'My journey'], ['repo', 'Repository'], ['ask', 'Ask Smriti']],
    learner: [['repo', 'Repository'], ['ask', 'Ask Smriti']],
  }[role]);
  Auth.home = (role) => ({ admin: 'admin', employee: 'journey', learner: 'repo' }[role]);

  w.Auth = Auth;
  if (typeof module !== 'undefined') module.exports = Auth;
})(typeof window !== 'undefined' ? window : globalThis);
