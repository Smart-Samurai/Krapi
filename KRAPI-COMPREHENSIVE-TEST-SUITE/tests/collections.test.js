/**
 * Collections & Schema Management Tests
 * 
 * Tests all collection CRUD operations, schema validation, and dynamic field management
 */

import TestFramework from '../utils/test-framework.js';
import CONFIG from '../config.js';
import axios from 'axios';

class CollectionsTests extends TestFramework {
  constructor(sessionToken, testProject) {
    super();
    this.sessionToken = sessionToken;
    this.testProject = testProject;
    this.testCollection = null;
    this.createdCollections = [];
  }

  async runAll() {
    return this.describe('🗂️ Collections & Schema Management', async () => {
      // Test 1: Create Collection with Basic Schema
      await this.test('Create Collection with Basic Schema', async () => {
        const collectionData = {
          name: `${CONFIG.TEST_COLLECTION_NAME}_${this.generateRandomString()}`,
          description: 'Test collection for comprehensive testing',
          fields: [
            { name: 'title', type: 'string', required: true },
            { name: 'description', type: 'text' },
            { name: 'status', type: 'string', default: 'draft' },
            { name: 'priority', type: 'integer', default: 1 },
            { name: 'is_active', type: 'boolean', default: true },
            { name: 'metadata', type: 'json', default: {} },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' }
          ],
          indexes: [
            { name: 'title_idx', fields: ['title'] },
            { name: 'status_priority_idx', fields: ['status', 'priority'] }
          ]
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
          collectionData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Collection creation should succeed');
        this.assertExists(response.data, 'id', 'Collection should have ID');
        this.assertExists(response.data, 'name', 'Collection should have name');
        this.assertExists(response.data, 'fields', 'Collection should have fields');
        this.assertEqual(response.data.name, collectionData.name, 'Collection name should match');
        this.assertTrue(Array.isArray(response.data.fields), 'Fields should be an array');
        this.assertEqual(response.data.fields.length, collectionData.fields.length, 'Field count should match');

        this.testCollection = response.data;
        this.createdCollections.push(response.data.name);
      });

      // Test 2: Get Collection by Name
      await this.test('Get Collection by Name', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Get collection should succeed');
        this.assertEqual(response.data.name, this.testCollection.name, 'Collection name should match');
        this.assertEqual(response.data.id, this.testCollection.id, 'Collection ID should match');
        this.assertTrue(Array.isArray(response.data.fields), 'Should return fields');
      });

      // Test 3: Create Collection with Advanced Field Types
      await this.test('Create Collection with Advanced Field Types', async () => {
        const advancedCollectionData = {
          name: `advanced_collection_${this.generateRandomString()}`,
          description: 'Collection with all supported field types',
          fields: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'name', type: 'string', required: true, unique: true },
            { name: 'email', type: 'string', unique: true },
            { name: 'age', type: 'integer' },
            { name: 'salary', type: 'decimal' },
            { name: 'is_verified', type: 'boolean', default: false },
            { name: 'birth_date', type: 'date' },
            { name: 'last_login', type: 'timestamp' },
            { name: 'bio', type: 'text' },
            { name: 'preferences', type: 'json', default: {} }
          ],
          indexes: [
            { name: 'email_unique_idx', fields: ['email'], unique: true },
            { name: 'name_age_idx', fields: ['name', 'age'] },
            { name: 'verified_idx', fields: ['is_verified'] }
          ]
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
          advancedCollectionData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Advanced collection creation should succeed');
        this.assertEqual(response.data.fields.length, advancedCollectionData.fields.length, 'All field types should be supported');
        
        // Verify each field type was created correctly
        const fieldTypes = response.data.fields.map(f => f.type);
        this.assertContains(fieldTypes, 'uuid', 'Should support UUID fields');
        this.assertContains(fieldTypes, 'decimal', 'Should support decimal fields');
        this.assertContains(fieldTypes, 'date', 'Should support date fields');
        this.assertContains(fieldTypes, 'timestamp', 'Should support timestamp fields');
        this.assertContains(fieldTypes, 'text', 'Should support text fields');
        this.assertContains(fieldTypes, 'json', 'Should support JSON fields');

        this.createdCollections.push(response.data.name);
      });

      // Test 4: Update Collection Schema
      await this.test('Update Collection Schema', async () => {
        const updateData = {
          description: 'Updated collection description',
          fields: [
            // Add new field
            { name: 'tags', type: 'json', default: [] },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' }
          ]
        };

        const response = await axios.put(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}`,
          updateData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Collection update should succeed');
        this.assertEqual(response.data.description, updateData.description, 'Description should be updated');
        
        // Verify new fields were added
        const fieldNames = response.data.fields.map(f => f.name);
        this.assertContains(fieldNames, 'tags', 'Should contain new tags field');
        this.assertContains(fieldNames, 'updated_at', 'Should contain new updated_at field');
      });

      // Test 5: Get All Collections in Project
      await this.test('Get All Collections in Project', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Get all collections should succeed');
        this.assertExists(response.data, 'data', 'Response should contain data array');
        this.assertTrue(Array.isArray(response.data.data), 'Data should be an array');
        this.assertGreaterThan(response.data.data.length, 0, 'Should have at least one collection');
        
        // Verify our test collection is in the list
        const ourCollection = response.data.data.find(c => c.name === this.testCollection.name);
        this.assertNotNull(ourCollection, 'Our test collection should be in the list');
      });

      // Test 6: Validate Collection Schema
      await this.test('Validate Collection Schema', async () => {
        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/validate-schema`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Schema validation should succeed');
        this.assertExists(response.data, 'valid', 'Response should contain valid flag');
        this.assertExists(response.data, 'issues', 'Response should contain issues array');
        this.assertTrue(Array.isArray(response.data.issues), 'Issues should be an array');
      });

      // Test 7: Create Collection with Validation Errors
      await this.test('Create Collection with Validation Errors', async () => {
        const invalidCollectionData = {
          name: 'invalid-collection-123',
          description: 'Collection with validation errors',
          fields: [
            { name: 'field with spaces', type: 'string' }, // Invalid field name
            { name: 'valid_field', type: 'invalid_type' }, // Invalid field type
            { name: '', type: 'string' } // Empty field name
          ]
        };

        try {
          await axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
            invalidCollectionData,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
          throw new Error('Should have failed with validation errors');
        } catch (error) {
          this.assertTrue(error.response.status >= 400 && error.response.status < 500, 'Should return client error for validation issues');
        }
      });

      // Test 8: Create Collection for User Management
      await this.test('Create Users Collection for Testing', async () => {
        const usersCollectionData = {
          name: 'users',
          description: 'User management collection for testing',
          fields: [
            { name: 'email', type: 'string', required: true, unique: true },
            { name: 'name', type: 'string', required: true },
            { name: 'role', type: 'string', default: 'user' },
            { name: 'is_active', type: 'boolean', default: true },
            { name: 'last_login', type: 'timestamp' },
            { name: 'profile', type: 'json', default: {} },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' }
          ],
          indexes: [
            { name: 'email_unique_idx', fields: ['email'], unique: true },
            { name: 'role_active_idx', fields: ['role', 'is_active'] }
          ]
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
          usersCollectionData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Users collection creation should succeed');
        this.createdCollections.push(response.data.name);
      });

      // Test 9: Create Collection for Task Management
      await this.test('Create Tasks Collection for Testing', async () => {
        const tasksCollectionData = {
          name: 'tasks',
          description: 'Task management collection for testing',
          fields: [
            { name: 'title', type: 'string', required: true },
            { name: 'description', type: 'text' },
            { name: 'status', type: 'string', default: 'todo' },
            { name: 'priority', type: 'string', default: 'medium' },
            { name: 'assignee_id', type: 'uuid' },
            { name: 'due_date', type: 'date' },
            { name: 'completed_at', type: 'timestamp' },
            { name: 'labels', type: 'json', default: [] },
            { name: 'metadata', type: 'json', default: {} },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' }
          ],
          indexes: [
            { name: 'status_priority_idx', fields: ['status', 'priority'] },
            { name: 'assignee_idx', fields: ['assignee_id'] },
            { name: 'due_date_idx', fields: ['due_date'] }
          ]
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
          tasksCollectionData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Tasks collection creation should succeed');
        this.createdCollections.push(response.data.name);
      });

      // Test 10: Get Collection Statistics
      await this.test('Get Collection Statistics', async () => {
        const response = await axios.get(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${this.testCollection.name}/statistics`,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Collection statistics should succeed');
        this.assertExists(response.data, 'total_documents', 'Stats should include document count');
        this.assertExists(response.data, 'total_size_bytes', 'Stats should include size');
        this.assertType(response.data.total_documents, 'number', 'Document count should be a number');
        this.assertType(response.data.total_size_bytes, 'number', 'Size should be a number');
      });

      // Test 11: Collection Name Validation
      await this.test('Collection Name Validation', async () => {
        const invalidNames = [
          'Collection With Spaces',
          'collection-with-dashes',
          '123numeric_start',
          'collection.with.dots',
          'UPPERCASE_COLLECTION'
        ];

        for (const invalidName of invalidNames) {
          try {
            await axios.post(
              `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
              {
                name: invalidName,
                description: 'Test collection with invalid name',
                fields: [{ name: 'test_field', type: 'string' }]
              },
              {
                headers: {
                  'Authorization': `Bearer ${this.sessionToken}`
                }
              }
            );
            throw new Error(`Should have failed for invalid name: ${invalidName}`);
          } catch (error) {
            this.assertTrue(error.response.status >= 400 && error.response.status < 500, `Should reject invalid name: ${invalidName}`);
          }
        }
      });

      // Test 12: Duplicate Collection Name
      await this.test('Prevent Duplicate Collection Names', async () => {
        try {
          await axios.post(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
            {
              name: this.testCollection.name, // Use existing collection name
              description: 'Duplicate collection',
              fields: [{ name: 'test_field', type: 'string' }]
            },
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
          throw new Error('Should have failed for duplicate collection name');
        } catch (error) {
          this.assertTrue(error.response.status >= 400 && error.response.status < 500, 'Should reject duplicate collection name');
        }
      });

      // Test 13: Complex Collection with All Features
      await this.test('Create Complex Collection with All Features', async () => {
        const complexCollectionData = {
          name: `complex_collection_${this.generateRandomString()}`,
          description: 'Complex collection showcasing all KRAPI features',
          fields: [
            { name: 'id', type: 'uuid', required: true },
            { name: 'title', type: 'string', required: true },
            { name: 'slug', type: 'string', unique: true },
            { name: 'content', type: 'text' },
            { name: 'excerpt', type: 'string' },
            { name: 'author_id', type: 'uuid', required: true },
            { name: 'category_id', type: 'uuid' },
            { name: 'view_count', type: 'integer', default: 0 },
            { name: 'rating', type: 'decimal', default: 0.0 },
            { name: 'is_published', type: 'boolean', default: false },
            { name: 'is_featured', type: 'boolean', default: false },
            { name: 'published_at', type: 'timestamp' },
            { name: 'expires_at', type: 'timestamp' },
            { name: 'birth_date', type: 'date' },
            { name: 'tags', type: 'json', default: [] },
            { name: 'metadata', type: 'json', default: {} },
            { name: 'seo_data', type: 'json', default: {} },
            { name: 'created_at', type: 'timestamp', default: 'NOW()' },
            { name: 'updated_at', type: 'timestamp', default: 'NOW()' }
          ],
          indexes: [
            { name: 'title_idx', fields: ['title'] },
            { name: 'slug_unique_idx', fields: ['slug'], unique: true },
            { name: 'author_published_idx', fields: ['author_id', 'is_published'] },
            { name: 'category_featured_idx', fields: ['category_id', 'is_featured'] },
            { name: 'published_date_idx', fields: ['published_at'] },
            { name: 'view_rating_idx', fields: ['view_count', 'rating'] }
          ]
        };

        const response = await axios.post(
          `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections`,
          complexCollectionData,
          {
            headers: {
              'Authorization': `Bearer ${this.sessionToken}`
            }
          }
        );

        this.assertHttpSuccess(response, 'Complex collection creation should succeed');
        this.assertEqual(response.data.fields.length, complexCollectionData.fields.length, 'All fields should be created');
        this.assertEqual(response.data.indexes.length, complexCollectionData.indexes.length, 'All indexes should be created');
        
        this.createdCollections.push(response.data.name);
      });
    });
  }

  getTestCollection() {
    return this.testCollection;
  }

  getCreatedCollections() {
    return this.createdCollections;
  }

  // Cleanup method for test teardown
  async cleanup() {
    if (CONFIG.CLEANUP_AFTER_TESTS && this.createdCollections.length > 0) {
      console.log(`\n🧹 Cleaning up ${this.createdCollections.length} test collections...`);
      
      for (const collectionName of this.createdCollections) {
        try {
          await axios.delete(
            `${CONFIG.BACKEND_URL}/projects/${this.testProject.id}/collections/${collectionName}`,
            {
              headers: {
                'Authorization': `Bearer ${this.sessionToken}`
              }
            }
          );
        } catch (error) {
          console.log(`Warning: Could not delete collection ${collectionName}`);
        }
      }
    }
  }
}

export default CollectionsTests;
