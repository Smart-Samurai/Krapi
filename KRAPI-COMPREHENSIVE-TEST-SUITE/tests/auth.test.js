/**
 * Authentication & Session Management Tests
 * 
 * Tests all authentication endpoints and session management functionality
 */

import TestFramework from '../utils/test-framework.js';
import CONFIG from '../config.js';
import axios from 'axios';

class AuthTests extends TestFramework {
  constructor() {
    super();
    this.sessionToken = null;
    this.adminApiKey = null;
  }

  async runAll() {
    return this.describe('🔐 Authentication & Session Management', async () => {
      // Test 1: Admin Login
      await this.test('Admin Login with Default Credentials', async () => {
        const response = await axios.post(`${CONFIG.BACKEND_URL}/auth/login`, {
          username: CONFIG.ADMIN_CREDENTIALS.username,
          password: CONFIG.ADMIN_CREDENTIALS.password,
          remember_me: true
        });

        this.assertHttpSuccess(response, 'Login should succeed');
        this.assertExists(response.data, 'token', 'Response should contain session token');
        this.assertExists(response.data, 'user', 'Response should contain user data');
        this.assertExists(response.data, 'expires_at', 'Response should contain expiration');
        this.assertType(response.data.token, 'string', 'Token should be a string');
        
        // Store session token for subsequent tests
        this.sessionToken = response.data.token;
      });

      // Test 2: Get Current User
      await this.test('Get Current User with Session Token', async () => {
        this.assertNotNull(this.sessionToken, 'Session token should be available');
        
        const response = await axios.get(`${CONFIG.BACKEND_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Get current user should succeed');
        this.assertExists(response.data, 'id', 'User should have ID');
        this.assertExists(response.data, 'username', 'User should have username');
        this.assertEqual(response.data.username, CONFIG.ADMIN_CREDENTIALS.username, 'Username should match');
      });

      // Test 3: Validate Session
      await this.test('Validate Session Token', async () => {
        const response = await axios.post(`${CONFIG.BACKEND_URL}/auth/validate`, {
          token: this.sessionToken
        });

        this.assertHttpSuccess(response, 'Session validation should succeed');
        this.assertTrue(response.data.valid, 'Session should be valid');
        this.assertExists(response.data, 'user', 'Validation should return user data');
      });

      // Test 4: Refresh Session
      await this.test('Refresh Session Token', async () => {
        const response = await axios.post(`${CONFIG.BACKEND_URL}/auth/refresh`, {}, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Session refresh should succeed');
        this.assertExists(response.data, 'token', 'Refresh should return new token');
        this.assertExists(response.data, 'expires_at', 'Refresh should return new expiration');
        
        // Update session token
        this.sessionToken = response.data.token;
      });

      // Test 5: Create API Key (Session)
      await this.test('Create API Key Session', async () => {
        // First, we need to create an API key via the admin interface
        // For testing, we'll assume we have access to create one
        const createKeyResponse = await axios.post(`${CONFIG.BACKEND_URL}/admin/api-keys`, {
          name: 'Test API Key',
          permissions: ['admin:read', 'admin:write', 'projects:read', 'projects:write'],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        }, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        if (createKeyResponse.status === 201) {
          this.adminApiKey = createKeyResponse.data.key;
          
          // Test creating session with API key
          const sessionResponse = await axios.post(`${CONFIG.BACKEND_URL}/auth/sessions`, {
            api_key: this.adminApiKey
          });

          this.assertHttpSuccess(sessionResponse, 'API key session creation should succeed');
          this.assertExists(sessionResponse.data, 'session_token', 'Should return session token');
          this.assertExists(sessionResponse.data, 'expires_at', 'Should return expiration');
          this.assertExists(sessionResponse.data, 'scopes', 'Should return scopes');
        } else {
          // Skip this test if we can't create API keys yet
          console.log('      Skipping API key test - admin API keys not yet implemented');
        }
      });

      // Test 6: Change Password
      await this.test('Change Admin Password', async () => {
        const newPassword = 'newTestPassword123!';
        
        const response = await axios.post(`${CONFIG.BACKEND_URL}/auth/change-password`, {
          current_password: CONFIG.ADMIN_CREDENTIALS.password,
          new_password: newPassword
        }, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Password change should succeed');
        
        // Test login with new password
        const loginResponse = await axios.post(`${CONFIG.BACKEND_URL}/auth/login`, {
          username: CONFIG.ADMIN_CREDENTIALS.username,
          password: newPassword
        });

        this.assertHttpSuccess(loginResponse, 'Login with new password should succeed');
        
        // Change password back for other tests
        await axios.post(`${CONFIG.BACKEND_URL}/auth/change-password`, {
          current_password: newPassword,
          new_password: CONFIG.ADMIN_CREDENTIALS.password
        }, {
          headers: {
            'Authorization': `Bearer ${loginResponse.data.token}`
          }
        });
        
        // Update session token
        this.sessionToken = loginResponse.data.token;
      });

      // Test 7: Invalid Login Attempts
      await this.test('Invalid Login Attempts', async () => {
        // Test wrong password
        try {
          await axios.post(`${CONFIG.BACKEND_URL}/auth/login`, {
            username: CONFIG.ADMIN_CREDENTIALS.username,
            password: 'wrongpassword'
          });
          throw new Error('Should have failed with wrong password');
        } catch (error) {
          this.assertEqual(error.response.status, 401, 'Should return 401 for wrong password');
        }

        // Test wrong username
        try {
          await axios.post(`${CONFIG.BACKEND_URL}/auth/login`, {
            username: 'wronguser',
            password: CONFIG.ADMIN_CREDENTIALS.password
          });
          throw new Error('Should have failed with wrong username');
        } catch (error) {
          this.assertEqual(error.response.status, 401, 'Should return 401 for wrong username');
        }
      });

      // Test 8: Invalid Session Token
      await this.test('Invalid Session Token Handling', async () => {
        try {
          await axios.get(`${CONFIG.BACKEND_URL}/auth/me`, {
            headers: {
              'Authorization': 'Bearer invalid-token-12345'
            }
          });
          throw new Error('Should have failed with invalid token');
        } catch (error) {
          this.assertEqual(error.response.status, 401, 'Should return 401 for invalid token');
        }
      });

      // Test 9: Logout
      await this.test('Logout and Invalidate Session', async () => {
        const response = await axios.post(`${CONFIG.BACKEND_URL}/auth/logout`, {}, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Logout should succeed');
        
        // Verify session is now invalid
        try {
          await axios.get(`${CONFIG.BACKEND_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          });
          throw new Error('Should have failed with invalidated token');
        } catch (error) {
          this.assertEqual(error.response.status, 401, 'Should return 401 for invalidated token');
        }
        
        // Re-login for subsequent tests
        const loginResponse = await axios.post(`${CONFIG.BACKEND_URL}/auth/login`, {
          username: CONFIG.ADMIN_CREDENTIALS.username,
          password: CONFIG.ADMIN_CREDENTIALS.password
        });
        this.sessionToken = loginResponse.data.token;
      });

      // Test 10: Session Persistence
      await this.test('Session Persistence and Reuse', async () => {
        // Test multiple requests with same session
        for (let i = 0; i < 3; i++) {
          const response = await axios.get(`${CONFIG.BACKEND_URL}/auth/me`, {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          });
          this.assertHttpSuccess(response, `Request ${i + 1} should succeed`);
        }
      });
    });
  }

  getSessionToken() {
    return this.sessionToken;
  }

  getApiKey() {
    return this.adminApiKey;
  }
}

export default AuthTests;
