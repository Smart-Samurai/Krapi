/**
 * Projects Management Tests
 * 
 * Tests all project CRUD operations, settings, statistics, and activity
 */

import TestFramework from '../utils/test-framework.js';
import CONFIG from '../config.js';
import axios from 'axios';

class ProjectsTests extends TestFramework {
  constructor(sessionToken) {
    super();
    this.sessionToken = sessionToken;
    this.testProject = null;
    this.createdProjects = [];
  }

  async runAll() {
    return this.describe('🎯 Projects Management', async () => {
      // Test 1: Create New Project
      await this.test('Create New Project', async () => {
        const projectData = {
          name: `${CONFIG.TEST_PROJECT_NAME}_${this.generateRandomString()}`,
          description: 'Test project created by comprehensive test suite',
          settings: {
            timezone: 'UTC',
            environment: 'test',
            auto_cleanup: true,
            test_created: true
          }
        };

        const response = await axios.post(`${CONFIG.BACKEND_URL}/projects`, projectData, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Project creation should succeed');
        this.assertExists(response.data, 'id', 'Project should have ID');
        this.assertExists(response.data, 'name', 'Project should have name');
        this.assertExists(response.data, 'created_at', 'Project should have created_at');
        this.assertEqual(response.data.name, projectData.name, 'Project name should match');
        this.assertEqual(response.data.description, projectData.description, 'Project description should match');

        // Store project for subsequent tests
        this.testProject = response.data;
        this.createdProjects.push(response.data.id);
      });

      // Test 2: Get Project by ID
      await this.test('Get Project by ID', async () => {
        this.assertNotNull(this.testProject, 'Test project should exist');

        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Get project should succeed');
        this.assertEqual(response.data.id, this.testProject.id, 'Project ID should match');
        this.assertEqual(response.data.name, this.testProject.name, 'Project name should match');
      });

      // Test 3: Update Project
      await this.test('Update Project', async () => {
        const updatedData = {
          name: `${this.testProject.name}_UPDATED`,
          description: 'Updated description for test project',
          settings: {
            ...this.testProject.settings,
            updated_by_test: true,
            last_update: new Date().toISOString()
          }
        };

        const response = await axios.put(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}`, updatedData, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Project update should succeed');
        this.assertEqual(response.data.name, updatedData.name, 'Updated name should match');
        this.assertEqual(response.data.description, updatedData.description, 'Updated description should match');
        this.assertExists(response.data, 'updated_at', 'Should have updated_at timestamp');

        // Update our test project reference
        this.testProject = response.data;
      });

      // Test 4: Get All Projects
      await this.test('Get All Projects', async () => {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Get all projects should succeed');
        this.assertExists(response.data, 'data', 'Response should contain data array');
        this.assertTrue(Array.isArray(response.data.data), 'Data should be an array');
        this.assertGreaterThan(response.data.data.length, 0, 'Should have at least one project');
        
        // Verify our test project is in the list
        const ourProject = response.data.data.find(p => p.id === this.testProject.id);
        this.assertNotNull(ourProject, 'Our test project should be in the list');
      });

      // Test 5: Get Projects with Pagination
      await this.test('Get Projects with Pagination', async () => {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects?limit=1&offset=0`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Paginated request should succeed');
        this.assertExists(response.data, 'data', 'Response should contain data');
        this.assertExists(response.data, 'total', 'Response should contain total count');
        this.assertExists(response.data, 'limit', 'Response should contain limit');
        this.assertExists(response.data, 'offset', 'Response should contain offset');
        this.assertTrue(response.data.data.length <= 1, 'Should respect limit parameter');
      });

      // Test 6: Create Multiple Projects for Testing
      await this.test('Create Multiple Projects for Testing', async () => {
        const projectPromises = [];
        
        for (let i = 0; i < 3; i++) {
          const projectData = {
            name: `TEST_PROJECT_${i}_${this.generateRandomString()}`,
            description: `Test project ${i} for comprehensive testing`,
            settings: {
              test_index: i,
              batch_created: true
            }
          };

          projectPromises.push(
            axios.post(`${CONFIG.BACKEND_URL}/projects`, projectData, {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            })
          );
        }

        const responses = await Promise.all(projectPromises);
        
        responses.forEach((response, index) => {
          this.assertHttpSuccess(response, `Project ${index} creation should succeed`);
          this.createdProjects.push(response.data.id);
        });

        this.assertEqual(responses.length, 3, 'Should create 3 projects');
      });

      // Test 7: Get Project Settings
      await this.test('Get Project Settings', async () => {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/settings`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Get project settings should succeed');
        this.assertType(response.data, 'object', 'Settings should be an object');
        this.assertTrue(response.data.test_created, 'Should contain our test setting');
      });

      // Test 8: Update Project Settings
      await this.test('Update Project Settings', async () => {
        const newSettings = {
          timezone: 'America/New_York',
          environment: 'testing',
          auto_cleanup: false,
          settings_updated: true,
          update_timestamp: new Date().toISOString()
        };

        const response = await axios.put(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/settings`, newSettings, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Update project settings should succeed');
        this.assertEqual(response.data.timezone, newSettings.timezone, 'Timezone should be updated');
        this.assertEqual(response.data.environment, newSettings.environment, 'Environment should be updated');
        this.assertTrue(response.data.settings_updated, 'Should contain new setting');
      });

      // Test 9: Get Project Statistics
      await this.test('Get Project Statistics', async () => {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/statistics`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Get project statistics should succeed');
        this.assertExists(response.data, 'totalCollections', 'Stats should include collection count');
        this.assertExists(response.data, 'totalDocuments', 'Stats should include document count');
        this.assertExists(response.data, 'totalUsers', 'Stats should include user count');
        this.assertType(response.data.totalCollections, 'number', 'Collection count should be a number');
        this.assertType(response.data.totalDocuments, 'number', 'Document count should be a number');
        this.assertType(response.data.totalUsers, 'number', 'User count should be a number');
      });

      // Test 10: Get Project Activity
      await this.test('Get Project Activity', async () => {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/activity`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Get project activity should succeed');
        this.assertExists(response.data, 'activities', 'Response should contain activities');
        this.assertTrue(Array.isArray(response.data.activities), 'Activities should be an array');
        
        if (response.data.activities.length > 0) {
          const activity = response.data.activities[0];
          this.assertExists(activity, 'action', 'Activity should have action');
          this.assertExists(activity, 'created_at', 'Activity should have timestamp');
        }
      });

      // Test 11: Get Project Activity with Filters
      await this.test('Get Project Activity with Filters', async () => {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/activity?limit=5&days=1`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(response, 'Filtered activity request should succeed');
        this.assertTrue(response.data.activities.length <= 5, 'Should respect limit parameter');
      });

      // Test 12: Invalid Project Operations
      await this.test('Invalid Project Operations', async () => {
        // Test get non-existent project
        try {
          await axios.get(`${CONFIG.BACKEND_URL}/projects/non-existent-id`, {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          });
          throw new Error('Should have failed for non-existent project');
        } catch (error) {
          this.assertEqual(error.response.status, 404, 'Should return 404 for non-existent project');
        }

        // Test create project with invalid data
        try {
          await axios.post(`${CONFIG.BACKEND_URL}/projects`, {
            // Missing required name field
            description: 'Project without name'
          }, {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          });
          throw new Error('Should have failed for missing required field');
        } catch (error) {
          this.assertTrue(error.response.status >= 400 && error.response.status < 500, 'Should return client error');
        }
      });

      // Test 13: Project Search and Filtering
      await this.test('Project Search and Filtering', async () => {
        // Test ordering
        const orderedResponse = await axios.get(`${CONFIG.BACKEND_URL}/projects?orderBy=created_at&order=desc`, {
          headers: {
            'Authorization': `Bearer ${this.sessionToken}`
          }
        });

        this.assertHttpSuccess(orderedResponse, 'Ordered request should succeed');
        this.assertTrue(orderedResponse.data.data.length > 0, 'Should return projects');
        
        // Verify ordering (newest first)
        if (orderedResponse.data.data.length > 1) {
          const first = new Date(orderedResponse.data.data[0].created_at);
          const second = new Date(orderedResponse.data.data[1].created_at);
          this.assertTrue(first >= second, 'Projects should be ordered by creation date desc');
        }
      });
    });
  }

  getTestProject() {
    return this.testProject;
  }

  getCreatedProjects() {
    return this.createdProjects;
  }

  // Cleanup method for test teardown
  async cleanup() {
    if (CONFIG.CLEANUP_AFTER_TESTS && this.createdProjects.length > 0) {
      console.log(`\n🧹 Cleaning up ${this.createdProjects.length} test projects...`);
      
      for (const projectId of this.createdProjects) {
        try {
          await axios.delete(`${CONFIG.BACKEND_URL}/projects/${projectId}`, {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          });
        } catch (error) {
          console.log(`Warning: Could not delete project ${projectId}`);
        }
      }
    }
  }
}

export default ProjectsTests;
