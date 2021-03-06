const knex = require('knex');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Projects Endpoints', function () {
  let db;

  const {
    testUsers,
    testRequests,
    testProjects,
    testVacancies,
    testPosts,
    testChats,
    testMessages,
    testNotifications
  } = helpers.makeFixtures();

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => helpers.cleanTables(db));

  afterEach('cleanup', () => helpers.cleanTables(db));

  // GET /api/projects endpoint test

  describe(`GET /api/projects`, () => {
    context(`Given no projects`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get('/api/projects').expect(200, []);
      });
    });

    context('Given there are projects in the database', () => {
      const testUser = testUsers[0];
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testVacancies,
          testRequests,
          testPosts,
          testChats,
          testMessages,
          testNotifications
        )
      );

      it('responds with 200 and all of the projects', () => {
        const expectedProjects = helpers.makeExpectedProjects(
          testProjects,
          testVacancies
        );
        return supertest(app)
          .get('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200, expectedProjects);
      });
    });

    // XSS test - malicious project
    context(`Given an XSS attack project`, () => {
      const testUser = testUsers[0];
      const testChat = testChats[0];
      const {
        maliciousProject,
        expectedProject,
        maliciousVacancy
      } = helpers.makeMaliciousData(testUser, testChat);
      beforeEach('insert malicious project', () => {
        return helpers.seedMaliciousProject(
          db,
          testUser,
          maliciousProject,
          maliciousVacancy
        );
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/projects`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body[0].name).to.eql(expectedProject.name);
            expect(res.body[0].description).to.eql(expectedProject.description);
          });
      });
    });
  });

  // GET /api/projects/user endpoint test

  describe(`GET /api/projects/user`, () => {
    context(`Given no user projects`, () => {
      const testUser = testUsers[0];
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers));

      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/projects/user')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200, []);
      });
    });

    context('Given there are user projects in the database', () => {
      const testUser = testUsers[0];
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testVacancies,
          testRequests,
          testPosts,
          testChats,
          testMessages,
          testNotifications
        )
      );

      it('responds with 200 and all of the user projects', () => {
        const expectedUserProjects = helpers.makeExpectedUserProjects(
          testUser.id,
          testProjects,
          testVacancies
        );
        return supertest(app)
          .get('/api/projects/user')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200, expectedUserProjects);
      });
    });

    // XSS test - malicious project
    context(`Given an XSS attack project`, () => {
      const testUser = testUsers[0];
      const {
        maliciousProject,
        expectedProject,
        maliciousVacancy
      } = helpers.makeMaliciousData(testUser, testChats[0]);
      beforeEach('insert malicious project', () => {
        return helpers.seedMaliciousProject(
          db,
          testUser,
          maliciousProject,
          maliciousVacancy
        );
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/projects/user`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body[0].name).to.eql(expectedProject.name);
            expect(res.body[0].description).to.eql(expectedProject.description);
          });
      });
    });
  });

  // api/projects/:project_handle endpoint test

  describe(`GET /api/projects/project_handle`, () => {
    context(`Given no projects`, () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers));
      it(`responds with 404`, () => {
        const testUser = testUsers[0];
        const project_handle = 'bad-handle';
        return supertest(app)
          .get(`/api/projects/${project_handle}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(404, {
            error: `No project found with handle ${project_handle}`
          });
      });
    });

    context('Given there are projects in the database', () => {
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testVacancies,
          testRequests,
          testPosts,
          testChats,
          testMessages,
          testNotifications
        )
      );

      it('responds with 200 and the specified project', () => {
        this.retries(3);
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const expectedProject = helpers.makeExpectedProjectByHandle(
          testProject,
          testVacancies,
          testUser
        );

        const project_handle = testProject.handle;
        expectedProject.userRole = 'owner';

        return supertest(app)
          .get(`/api/projects/${project_handle}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200, expectedProject);
      });
    });
    // XSS test - malicious project
    context(`Given an XSS attack project`, () => {
      const testUser = testUsers[0];
      const {
        maliciousProject,
        expectedProject,
        maliciousVacancy
      } = helpers.makeMaliciousData(testUser, testChats[0]);
      beforeEach('insert malicious project', () => {
        return helpers.seedMaliciousProject(
          db,
          testUser,
          maliciousProject,
          maliciousVacancy
        );
      });

      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/projects/${maliciousProject.handle}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(200)
          .expect(res => {
            expect(res.body.name).to.eql(expectedProject.name);
            expect(res.body.description).to.eql(expectedProject.description);
          });
      });
    });
  });

  // POST api/projects/ endpoint test

  describe(`POST /api/projects`, () => {
    context('Given there are projects in the database', () => {
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testVacancies,
          testRequests,
          testPosts,
          testChats,
          testMessages,
          testNotifications
        )
      );

      it('creates a project, responding with 201 and the new project', () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'new name',
          creator_id: testProject.creator_id,
          handle: 'new-name',
          description: testProject.description,
          date_created: testProject.date_created
        };
        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(201)
          .expect(res => {
            expect(res.body).to.have.property('id');
            expect(res.body.name).to.eql(newProject.name);
            expect(res.body.description).to.eql(newProject.description);
            expect(res.body.handle).to.eql(newProject.handle);
            const expectedDate = new Date().toLocaleString();
            const actualDate = new Date(res.body.date_created).toLocaleString();
            expect(actualDate).to.eql(expectedDate);
          })
          .expect(res =>
            db
              .from('projects')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then(row => {
                expect(row.name).to.eql(newProject.name);
                expect(row.description).to.eql(newProject.description);
                expect(row.handle).to.eql(newProject.handle);
                const expectedDate = new Date().toLocaleString();
                const actualDate = new Date(row.date_created).toLocaleString();
                expect(actualDate).to.eql(expectedDate);
              })
          );
      });

      it(`responds with 400 error when name is less than 2 characters`, () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'a',
          creator_id: testProject.creator_id,
          handle: 'new-name',
          description: testProject.description,
          date_created: testProject.date_created
        };

        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(400, { error: `Project name must be 2 or more characters` });
      });

      it(`responds with 400 error when name is more than than 30 characters`, () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'a'.repeat(31),
          creator_id: testProject.creator_id,
          handle: 'new-name',
          description: testProject.description,
          date_created: testProject.date_created
        };

        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(400, {
            error: `Project name must be less than 30 characters`
          });
      });

      it(`responds with 400 error when breaking name constraints`, () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'invalid@project@name!',
          creator_id: testProject.creator_id,
          handle: 'new-name',
          description: testProject.description,
          date_created: testProject.date_created
        };

        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(400, {
            error: `Project name must contain only alphabetic characters or numbers and only 1 hyphen, underscore or space between them`
          });
      });

      it(`responds with 400 error when description is less than 10 characters`, () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'valid-name',
          creator_id: testProject.creator_id,
          handle: 'valid-handle',
          description: '123456789',
          date_created: testProject.date_created
        };

        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(400, {
            error: `Description must be 10 or more characters`
          });
      });

      it(`responds with 400 error when description is more than 255 characters`, () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'valid-name',
          creator_id: testProject.creator_id,
          handle: 'valid-handle',
          description: 'a'.repeat(256),
          date_created: testProject.date_created
        };

        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(400, {
            error: `Description must be 255 characters or less`
          });
      });

      it(`responds with 400 error when project has more than 10 tags`, () => {
        const testUser = testUsers[0];
        const testProject = testProjects[0];
        const newProject = {
          id: testProject.id,
          name: 'valid-name',
          creator_id: testProject.creator_id,
          handle: 'valid-handle',
          description: testProject.description,
          tags: new Array(11).fill('TAG'),
          date_created: testProject.date_created
        };

        return supertest(app)
          .post('/api/projects')
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .send(newProject)
          .expect(400, {
            error: `You may only enter up to 10 tags!`
          });
      });

      const projectUrls = ['live_url', 'trello_url', 'github_url'];

      projectUrls.forEach(projectUrl => {
        it(`responds with 400 error when project has an invalid ${projectUrl}`, () => {
          const testUser = testUsers[0];
          const testProject = testProjects[0];
          const newProject = {
            id: testProject.id,
            name: 'valid-name',
            creator_id: testProject.creator_id,
            handle: 'valid-handle',
            description: testProject.description,
            tags: new Array(10).fill('VALID-TAG'),
            live_url: 'https://www.my-app.com/',
            trello_url: 'https://trello.com/b/CoAbb51N/sample-app',
            github_url: 'https://github.com/some-github-repo',
            date_created: testProject.date_created
          };

          newProject[projectUrl] = 'b@d_url';

          return supertest(app)
            .post('/api/projects')
            .set('Authorization', helpers.makeAuthHeader(testUser))
            .send(newProject)
            .expect(400, {
              error: `${projectUrl} is an invalid URL`
            });
        });
      });
    });
  });
  // DELETE api/projects/:project_id endpoint test

  describe(`DELETE /api/projects/:project_id`, () => {
    context(`Given no projects`, () => {
      beforeEach('insert users', () => helpers.seedUsers(db, testUsers));
      it(`responds with 404`, () => {
        const testUser = testUsers[0];
        const project_handle = 'bad-handle';
        return supertest(app)
          .get(`/api/projects/${project_handle}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(404, {
            error: `No project found with handle ${project_handle}`
          });
      });
    });
    context('Given there are projects in the database', () => {
      beforeEach('insert projects', () =>
        helpers.seedProjectsTables(
          db,
          testUsers,
          testProjects,
          testVacancies,
          testRequests,
          testPosts,
          testChats,
          testMessages,
          testNotifications
        )
      );

      it('responds with 204 and removes the project', () => {
        const testUser = testUsers[0];
        const idToRemove = 1;
        const expectedProjects = helpers
          .makeExpectedProjects(testProjects, testVacancies)
          .filter(project => project.id !== idToRemove);

        return supertest(app)
          .delete(`/api/projects/${idToRemove}`)
          .set('Authorization', helpers.makeAuthHeader(testUser))
          .expect(204)
          .then(() => {
            return supertest(app).get(`/api/projects`).expect(expectedProjects);
          });
      });
    });
  });
});
