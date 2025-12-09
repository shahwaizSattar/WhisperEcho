// Admin authentication utilities
export const adminAuth = {
  // Check if user is authenticated as admin
  isAuthenticated: () => {
    return localStorage.getItem('isAdmin') === 'true' && localStorage.getItem('adminToken');
  },

  // Login with hardcoded credentials
  login: (username, password) => {
    const ADMIN_USERNAME = 'superadmin';
    const ADMIN_PASSWORD = 'WhisperEcho@2025';
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem('isAdmin', 'true');
      // Generate a simple token for API calls
      const token = btoa(`${username}:${password}:${Date.now()}`);
      localStorage.setItem('adminToken', token);
      return { success: true };
    } else {
      return { 
        success: false, 
        error: 'Invalid credentials. Please check your username and password.' 
      };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminLoginTime');
  },

  // Get admin token
  getToken: () => {
    return localStorage.getItem('adminToken');
  },

  // Get admin info (for display purposes)
  getAdminInfo: () => {
    if (adminAuth.isAuthenticated()) {
      return {
        username: 'superadmin',
        role: 'Super Administrator',
        loginTime: localStorage.getItem('adminLoginTime') || new Date().toISOString()
      };
    }
    return null;
  },

  // Set login time
  setLoginTime: () => {
    localStorage.setItem('adminLoginTime', new Date().toISOString());
  }
};

export default adminAuth;