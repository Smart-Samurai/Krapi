/**
 * Documents CRUD & Bulk Operations Tests
 * 
 * Tests all document operations including CRUD, bulk operations, querying, and aggregation
 */

import TestFramework from '../utils/test-framework.js';
import CONFIG from '../config.js';
import axios from 'axios';

class DocumentsTests extends TestFramework {
  constructor(sessionToken, testProject, testCollection) {
    super();
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.testCollection = testCollection;
    this.testDocument = null;
    this.createdDocuments = [];
    this.testUsers = [];
    this.testTasks = [];
  }

  async runAll() {
    return this.describe('📄 Documents CRUD & Operations', async () => {
      // Test 1: Create Single Document
      await this.test('Create Single Document', async () => {
        const documentData = {
          data: {
            title: 'Test Document Title',
            description: 'This is a comprehensive test document created by the test suite',
            status: 'active',
            priority: 5,
            is_active: true,
            metadata: {
              test_created: true,
              test_suite: 'comprehensive',
              created_by: 'test_framework'
            }
          },
          created_by: 'test_user'
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          documentData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Document creation should succeed');
        this.assertExists(response.data, 'id', 'Document should have ID');
        this.assertExists(response.data, 'data', 'Document should have data');
        this.assertExists(response.data, 'created_at', 'Document should have created_at');
        this.assertEqual(response.data.data.title, documentData.data.title, 'Title should match');
        this.assertEqual(response.data.data.status, documentData.data.status, 'Status should match');
        this.assertTrue(response.data.data.metadata.test_created, 'Metadata should be preserved');

        this.testDocument = response.data;
        this.createdDocuments.push(response.data.id);
      });

      // Test 2: Get Document by ID
      await this.test('Get Document by ID', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${this.testDocument.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Get document should succeed');
        this.assertEqual(response.data.id, this.testDocument.id, 'Document ID should match');
        this.assertEqual(response.data.data.title, this.testDocument.data.title, 'Document data should match');
      });

      // Test 3: Update Document
      await this.test('Update Document', async () => {
        const updateData = {
          data: {
            title: 'Updated Test Document Title',
            description: 'This document has been updated by the test suite',
            status: 'updated',
            priority: 10,
            metadata: {
              ...this.testDocument.data.metadata,
              updated_by_test: true,
              last_update: new Date().toISOString()
            }
          },
          updated_by: 'test_updater'
        };

        const response = await axios.put(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${this.testDocument.id}`,
          updateData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Document update should succeed');
        this.assertEqual(response.data.data.title, updateData.data.title, 'Title should be updated');
        this.assertEqual(response.data.data.status, updateData.data.status, 'Status should be updated');
        this.assertTrue(response.data.data.metadata.updated_by_test, 'Updated metadata should be preserved');
        this.assertExists(response.data, 'updated_at', 'Should have updated_at timestamp');

        this.testDocument = response.data;
      });

      // Test 4: Create Multiple Documents for Testing
      await this.test('Create Multiple Test Documents', async () => {
        const testDocuments = [
          {
            data: {
              title: 'High Priority Task',
              description: 'This is a high priority task',
              status: 'todo',
              priority: 10,
              is_active: true,
              metadata: { category: 'urgent', department: 'engineering' }
            }
          },
          {
            data: {
              title: 'Medium Priority Task',
              description: 'This is a medium priority task',
              status: 'in_progress',
              priority: 5,
              is_active: true,
              metadata: { category: 'normal', department: 'marketing' }
            }
          },
          {
            data: {
              title: 'Low Priority Task',
              description: 'This is a low priority task',
              status: 'done',
              priority: 1,
              is_active: false,
              metadata: { category: 'maintenance', department: 'operations' }
            }
          },
          {
            data: {
              title: 'Archived Task',
              description: 'This task has been archived',
              status: 'archived',
              priority: 0,
              is_active: false,
              metadata: { category: 'old', department: 'legacy' }
            }
          }
        ];

        const promises = testDocuments.map(docData =>
          axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
            docData,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          )
        );

        const responses = await Promise.all(promises);
        
        responses.forEach((response, index) => {
          this.assertHttpSuccess(response, `Document ${index + 1} creation should succeed`);
          this.createdDocuments.push(response.data.id);
        });

        this.assertEqual(responses.length, testDocuments.length, 'All test documents should be created');
      });

      // Test 5: Get All Documents
      await this.test('Get All Documents', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Get all documents should succeed');
        this.assertExists(response.data, 'data', 'Response should contain data array');
        this.assertTrue(Array.isArray(response.data.data), 'Data should be an array');
        this.assertGreaterThan(response.data.data.length, 0, 'Should have at least one document');
        this.assertExists(response.data, 'total', 'Response should contain total count');
      });

      // Test 6: Get Documents with Pagination
      await this.test('Get Documents with Pagination', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?limit=2&offset=0`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Paginated request should succeed');
        this.assertTrue(response.data.data.length <= 2, 'Should respect limit parameter');
        this.assertEqual(response.data.limit, 2, 'Response should contain limit');
        this.assertEqual(response.data.offset, 0, 'Response should contain offset');
      });

      // Test 7: Filter Documents by Status
      await this.test('Filter Documents by Status', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[status]=todo`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Filtered request should succeed');
        
        if (response.data.data.length > 0) {
          response.data.data.forEach(doc => {
            this.assertEqual(doc.data.status, 'todo', 'All documents should have todo status');
          });
        }
      });

      // Test 8: Filter Documents by Multiple Criteria
      await this.test('Filter Documents by Multiple Criteria', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[is_active]=true&filter[priority][gte]=5`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Complex filtered request should succeed');
        
        if (response.data.data.length > 0) {
          response.data.data.forEach(doc => {
            this.assertTrue(doc.data.is_active, 'All documents should be active');
            this.assertGreaterThan(doc.data.priority, 4, 'All documents should have priority >= 5');
          });
        }
      });

      // Test 9: Sort Documents
      await this.test('Sort Documents by Priority', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?orderBy=priority&order=desc`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Sorted request should succeed');
        
        if (response.data.data.length > 1) {
          for (let i = 0; i < response.data.data.length - 1; i++) {
            const current = response.data.data[i].data.priority;
            const next = response.data.data[i + 1].data.priority;
            this.assertTrue(current >= next, 'Documents should be sorted by priority descending');
          }
        }
      });

      // Test 10: Count Documents
      await this.test('Count Documents', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/count`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Count request should succeed');
        this.assertExists(response.data, 'count', 'Response should contain count');
        this.assertType(response.data.count, 'number', 'Count should be a number');
        this.assertGreaterThan(response.data.count, 0, 'Should have counted documents');
      });

      // Test 11: Count Documents with Filter
      await this.test('Count Documents with Filter', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/count?filter[is_active]=true`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Filtered count request should succeed');
        this.assertType(response.data.count, 'number', 'Count should be a number');
      });

      // Test 12: Bulk Create Documents
      await this.test('Bulk Create Documents', async () => {
        const bulkDocuments = [
          {
            data: {
              title: 'Bulk Document 1',
              description: 'First bulk created document',
              status: 'bulk_created',
              priority: 3,
              is_active: true,
              metadata: { bulk_batch: 1, source: 'test_suite' }
            }
          },
          {
            data: {
              title: 'Bulk Document 2',
              description: 'Second bulk created document',
              status: 'bulk_created',
              priority: 4,
              is_active: true,
              metadata: { bulk_batch: 1, source: 'test_suite' }
            }
          },
          {
            data: {
              title: 'Bulk Document 3',
              description: 'Third bulk created document',
              status: 'bulk_created',
              priority: 2,
              is_active: true,
              metadata: { bulk_batch: 1, source: 'test_suite' }
            }
          }
        ];

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk`,
          { documents: bulkDocuments },
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Bulk create should succeed');
        this.assertExists(response.data, 'created', 'Response should contain created documents');
        this.assertExists(response.data, 'errors', 'Response should contain errors array');
        this.assertTrue(Array.isArray(response.data.created), 'Created should be an array');
        this.assertEqual(response.data.created.length, bulkDocuments.length, 'All documents should be created');

        // Store created document IDs
        response.data.created.forEach(doc => {
          this.createdDocuments.push(doc.id);
        });
      });

      // Test 13: Bulk Update Documents
      await this.test('Bulk Update Documents', async () => {
        // Get some documents to update
        const getResponse = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[status]=bulk_created&limit=2`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        if (getResponse.data.data.length > 0) {
          const updates = getResponse.data.data.map(doc => ({
            id: doc.id,
            data: {
              ...doc.data,
              status: 'bulk_updated',
              priority: doc.data.priority + 1,
              metadata: {
                ...doc.data.metadata,
                bulk_updated: true,
                update_timestamp: new Date().toISOString()
              }
            }
          }));

          const response = await axios.put(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk`,
            { updates },
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );

          this.assertHttpSuccess(response, 'Bulk update should succeed');
          this.assertExists(response.data, 'updated', 'Response should contain updated documents');
          this.assertExists(response.data, 'errors', 'Response should contain errors array');
          this.assertEqual(response.data.updated.length, updates.length, 'All documents should be updated');
        }
      });

      // Test 14: Bulk Delete Documents
      await this.test('Bulk Delete Documents', async () => {
        // Get some documents to delete
        const getResponse = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents?filter[status]=bulk_updated&limit=2`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        if (getResponse.data.data.length > 0) {
          const documentIds = getResponse.data.data.map(doc => doc.id);

          const response = await axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk-delete`,
            { 
              document_ids: documentIds,
              deleted_by: 'test_suite'
            },
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );

          this.assertHttpSuccess(response, 'Bulk delete should succeed');
          this.assertExists(response.data, 'deleted_count', 'Response should contain deleted count');
          this.assertExists(response.data, 'errors', 'Response should contain errors array');
          this.assertEqual(response.data.deleted_count, documentIds.length, 'All documents should be deleted');

          // Remove from our tracking
          documentIds.forEach(id => {
            const index = this.createdDocuments.indexOf(id);
            if (index > -1) {
              this.createdDocuments.splice(index, 1);
            }
          });
        }
      });

      // Test 15: Aggregate Documents
      await this.test('Aggregate Documents', async () => {
        const aggregationQuery = {
          group_by: ['status'],
          aggregations: {
            total_count: { type: 'count' },
            avg_priority: { type: 'avg', field: 'priority' },
            max_priority: { type: 'max', field: 'priority' },
            min_priority: { type: 'min', field: 'priority' }
          }
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/aggregate`,
          aggregationQuery,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Aggregation should succeed');
        this.assertExists(response.data, 'groups', 'Response should contain groups');
        this.assertExists(response.data, 'total_groups', 'Response should contain total_groups');
        this.assertType(response.data.total_groups, 'number', 'Total groups should be a number');
      });

      // Test 16: Create User Documents for User Management Testing
      await this.test('Create User Documents for Testing', async () => {
        const userData = [
          {
            data: {
              email: 'john.doe@test.com',
              name: 'John Doe',
              role: 'admin',
              is_active: true,
              profile: {
                department: 'Engineering',
                skills: ['JavaScript', 'Python', 'React'],
                bio: 'Senior developer with 5 years experience'
              }
            }
          },
          {
            data: {
              email: 'jane.smith@test.com',
              name: 'Jane Smith',
              role: 'user',
              is_active: true,
              profile: {
                department: 'Marketing',
                skills: ['SEO', 'Content Writing', 'Analytics'],
                bio: 'Marketing specialist focused on digital growth'
              }
            }
          },
          {
            data: {
              email: 'bob.wilson@test.com',
              name: 'Bob Wilson',
              role: 'moderator',
              is_active: false,
              profile: {
                department: 'Support',
                skills: ['Customer Service', 'Troubleshooting'],
                bio: 'Customer support lead'
              }
            }
          }
        ];

        // First, ensure we have a users collection
        try {
          await axios.get(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/users`,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
        } catch (error) {
          // Collection doesn't exist, skip this test
          console.log('      Skipping user documents test - users collection not found');
          return;
        }

        const promises = userData.map(user =>
          axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/users/documents`,
            user,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          )
        );

        const responses = await Promise.all(promises);
        
        responses.forEach((response, index) => {
          this.assertHttpSuccess(response, `User ${index + 1} creation should succeed`);
          this.testUsers.push(response.data);
        });
      });

      // Test 17: Create Task Documents for Task Management Testing
      await this.test('Create Task Documents for Testing', async () => {
        const taskData = [
          {
            data: {
              title: 'Implement User Authentication',
              description: 'Add login and registration functionality',
              status: 'todo',
              priority: 'high',
              assignee_id: this.testUsers.length > 0 ? this.testUsers[0].id : null,
              due_date: '2024-02-15',
              labels: ['backend', 'security', 'authentication'],
              metadata: {
                estimated_hours: 8,
                complexity: 'medium'
              }
            }
          },
          {
            data: {
              title: 'Design Landing Page',
              description: 'Create wireframes and design for the main landing page',
              status: 'in_progress',
              priority: 'medium',
              assignee_id: this.testUsers.length > 1 ? this.testUsers[1].id : null,
              due_date: '2024-02-10',
              labels: ['frontend', 'design', 'ui'],
              metadata: {
                estimated_hours: 12,
                complexity: 'low'
              }
            }
          },
          {
            data: {
              title: 'Setup Database Schema',
              description: 'Create initial database schema and migrations',
              status: 'done',
              priority: 'high',
              assignee_id: this.testUsers.length > 0 ? this.testUsers[0].id : null,
              due_date: '2024-02-05',
              completed_at: new Date().toISOString(),
              labels: ['database', 'schema', 'migration'],
              metadata: {
                estimated_hours: 6,
                complexity: 'high'
              }
            }
          }
        ];

        // Check if tasks collection exists
        try {
          await axios.get(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/tasks`,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
        } catch (error) {
          console.log('      Skipping task documents test - tasks collection not found');
          return;
        }

        const promises = taskData.map(task =>
          axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/tasks/documents`,
            task,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          )
        );

        const responses = await Promise.all(promises);
        
        responses.forEach((response, index) => {
          this.assertHttpSuccess(response, `Task ${index + 1} creation should succeed`);
          this.testTasks.push(response.data);
        });
      });

      // Test 18: Invalid Document Operations
      await this.test('Invalid Document Operations', async () => {
        // Test create document with invalid data
        try {
          await axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
            {
              data: {
                // Missing required title field
                description: 'Document without required title'
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
          throw new Error('Should have failed for missing required field');
        } catch (error) {
          this.assertTrue(error.response.status >= 400 && error.response.status < 500, 'Should return client error for invalid data');
        }

        // Test get non-existent document
        try {
          await axios.get(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/non-existent-id`,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
          throw new Error('Should have failed for non-existent document');
        } catch (error) {
          this.assertEqual(error.response.status, 404, 'Should return 404 for non-existent document');
        }
      });

      // Test 19: Delete Single Document
      await this.test('Delete Single Document', async () => {
        // Create a document specifically for deletion
        const docToDelete = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents`,
          {
            data: {
              title: 'Document to Delete',
              description: 'This document will be deleted',
              status: 'to_delete',
              priority: 1,
              is_active: false
            }
          },
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        const response = await axios.delete(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${docToDelete.data.id}`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Document deletion should succeed');
        
        // Verify document is deleted
        try {
          await axios.get(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/${docToDelete.data.id}`,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
          throw new Error('Should have failed to get deleted document');
        } catch (error) {
          this.assertEqual(error.response.status, 404, 'Deleted document should not be found');
        }
      });
    });
  }

  getTestDocument() {
    return this.testDocument;
  }

  getCreatedDocuments() {
    return this.createdDocuments;
  }

  getTestUsers() {
    return this.testUsers;
  }

  getTestTasks() {
    return this.testTasks;
  }

  // Cleanup method for test teardown
  async cleanup() {
    if (CONFIG.CLEANUP_AFTER_TESTS && this.createdDocuments.length > 0) {
      console.log(`\n🧹 Cleaning up ${this.createdDocuments.length} test documents...`);
      
      // Use bulk delete for efficiency
      try {
        await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/documents/bulk-delete`,
          { 
            document_ids: this.createdDocuments,
            deleted_by: 'test_cleanup'
          },
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );
      } catch (error) {
        console.log('Warning: Could not bulk delete test documents');
      }
    }
  }
}

export default DocumentsTests;
