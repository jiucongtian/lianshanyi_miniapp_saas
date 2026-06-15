// Test setup — set required env vars before any test
process.env.JWT_SECRET = 'test_jwt_secret_32chars_minimum_length';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_32chars_minimum';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.JWT_GUEST_EXPIRES_IN = '30d';
process.env.SMS_PROVIDER = 'mock';
process.env.AI_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';
// 32-byte AES key for open-app secret encryption tests
process.env.OPENAPI_SECRET_ENC_KEY = 'a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1c2d3e4f5a0b1';
// Use dedicated test DB on the running Docker MongoDB
process.env.MONGO_URI = process.env.MONGO_URI ?? 'mongodb://localhost:27017/lianshanyi_test';
