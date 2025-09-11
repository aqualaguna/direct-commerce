import request from 'supertest';

describe('Hello Integration Tests with Authentication', () => {
  let adminToken: string;

  beforeAll(async () => {
    // Get admin token for authenticated requests
    adminToken = process.env.STRAPI_API_TOKEN as string;
    
    if (!adminToken) {
      throw new Error('STRAPI_API_TOKEN environment variable is not set. Please ensure the test server is running and the token is generated.');
    }
  });

  it('should success call hello world api without auth', async () => {
    const response = await request(process.env.TEST_SERVER_URL as string)
      .get("/api/hello")
      .timeout(5000);
    
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello World!");
  });

  it('should success call hello world api with auth', async () => {
    const response = await request(process.env.TEST_SERVER_URL as string)
      .get("/api/hello")
      .set('Authorization', `Bearer ${adminToken}`)
      .timeout(5000);
    
    expect(response.status).toBe(200);
    expect(response.text).toBe("Hello World!");
  });
});
