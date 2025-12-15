/**
 * Project Tests
 * 
 * Created: 2025-11-30
 * Last Updated: 2025-11-30
 */

export async function runProjectTests(testSuite) {
    testSuite.logger.suiteStart("Project Management Tests");

    await testSuite.test("Create test project via SDK", async () => {
      // Use unique project name to avoid UNIQUE constraint errors from previous runs
      const projectName = `Test Project ${Date.now()}`;

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.projects?.create !== "function") {
        throw new Error("krapi.projects.create method not available");
      }

      const project = await testSuite.krapi.projects.create({
        name: projectName,
        description: "A test project for comprehensive testing",
      });

      // SDK returns Project directly
      testSuite.assert(project, "Project creation should succeed");
      testSuite.assert(project.id, "Project should have an ID");

      testSuite.testProject = project;
      testSuite.logger.setTestProject(testSuite.testProject);
    });

    await testSuite.test("Get all projects via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.projects?.getAll !== "function") {
        throw new Error("krapi.projects.getAll method not available");
      }

      const projects = await testSuite.krapi.projects.getAll();

      // SDK returns Project[] directly
      testSuite.assert(Array.isArray(projects), "Should return projects array");
      testSuite.assert(projects.length > 0, "Should have at least one project");
    });

    await testSuite.test("Get project by ID via SDK", async () => {
      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.projects?.get !== "function") {
        throw new Error("krapi.projects.get method not available");
      }

      const project = await testSuite.krapi.projects.get(testSuite.testProject.id);

      // SDK returns Project directly
      testSuite.assert(project, "Should return project");
      testSuite.assert(
        project.id === testSuite.testProject.id,
        "Should return correct project"
      );
    });

    await testSuite.test("Update project via SDK", async () => {
      // Use unique project name to avoid UNIQUE constraint errors from previous runs
      const updatedName = `Updated Test Project ${Date.now()}`;

      // Use SDK method instead of direct axios call
      if (typeof testSuite.krapi.projects?.update !== "function") {
        throw new Error("krapi.projects.update method not available");
      }

      const project = await testSuite.krapi.projects.update(testSuite.testProject.id, {
        name: updatedName,
        description: "Updated description",
      });

      // SDK returns updated Project directly
      testSuite.assert(project, "Should return updated project");
      testSuite.assert(project.name === updatedName, "Should update name");
    });

    await testSuite.test("Get project statistics via SDK", async () => {
      if (typeof testSuite.krapi.projects?.getStatistics !== "function") {
        throw new Error("krapi.projects.getStatistics method not available - SDK must implement this method");
      }

      const stats = await testSuite.krapi.projects.getStatistics(
        testSuite.testProject.id
      );
      testSuite.assert(stats, "Should return project statistics");
      testSuite.assertHasData(stats, "Project statistics should have real data");
      testSuite.assert(
        typeof stats === "object",
        "Statistics should be an object"
      );
    });

    await testSuite.test("Get project settings via SDK", async () => {
      if (typeof testSuite.krapi.projects?.getSettings !== "function") {
        throw new Error("krapi.projects.getSettings method not available - SDK must implement this method");
      }

      const settings = await testSuite.krapi.projects.getSettings(
        testSuite.testProject.id
      );
      testSuite.assert(settings, "Should return project settings");
      testSuite.assertHasData(settings, "Project settings should have real data");
      testSuite.assert(
        typeof settings === "object",
        "Settings should be an object"
      );
    });

    await testSuite.test("Update project settings via SDK", async () => {
      if (typeof testSuite.krapi.projects?.updateSettings !== "function") {
        throw new Error("krapi.projects.updateSettings method not available - SDK must implement this method");
      }

      const settings = await testSuite.krapi.projects.updateSettings(
        testSuite.testProject.id,
        {
          test_setting: "test_value",
        }
      );
      testSuite.assert(settings, "Should return updated settings");
      testSuite.assertHasData(settings, "Updated settings should have real data");
      testSuite.assert(
        typeof settings === "object",
        "Settings should be an object"
      );
    });

    await testSuite.test("Get project activity via SDK", async () => {
      if (typeof testSuite.krapi.projects?.getActivity !== "function") {
        throw new Error("krapi.projects.getActivity method not available - SDK must implement this method");
      }

      const activity = await testSuite.krapi.projects.getActivity(
        testSuite.testProject.id,
        {
          limit: 10,
        }
      );
      testSuite.assert(Array.isArray(activity), "Should return activity array");
      testSuite.assertHasData(activity, "Project activity should be returned (may be empty array but should be valid)");
    });
  }
