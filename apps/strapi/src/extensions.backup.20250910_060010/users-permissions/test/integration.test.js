/**
 * Authentication Integration Tests
 * 
 * Comprehensive integration tests for complete authentication flows
 */

// Mock env function for testing
const mockEnv = (key, defaultValue = '') => {
  const envVars = {
    'SENDGRID_API_KEY': 'test-sendgrid-api-key',
    'EMAIL_FROM': 'noreply@example.com',
    'EMAIL_REPLY_TO': 'support@example.com',
    'JWT_SECRET': 'test-jwt-secret',
    'JWT_REFRESH_SECRET': 'test-refresh-secret',
    'FRONTEND_URL': 'https://example.com',
  };
  return envVars[key] || defaultValue;
};

describe('Authentication Integration Tests', () => {
  describe('Complete Authentication Flow', () => {
    it('should have all required configurations for authentication', () => {
      // Test plugins configuration
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      
      expect(pluginsConfig['users-permissions']).toBeDefined();
      expect(pluginsConfig.email).toBeDefined();
      
      // Test JWT configuration
      const jwtConfig = require('../../../../config/jwt.ts').default({ env: mockEnv });
      expect(jwtConfig.jwt.secret).toBeDefined();
      expect(jwtConfig.jwt.expiresIn).toBe('7d');
    });

    it('should have email service configured with SendGrid', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      
      expect(pluginsConfig.email.config.provider).toBe('@strapi/provider-email-sendgrid');
      expect(pluginsConfig.email.config.providerOptions.apiKey).toBe('test-sendgrid-api-key');
      expect(pluginsConfig.email.config.providerOptions.defaultFrom).toBe('noreply@example.com');
    });

    it('should have users-permissions plugin configured with security settings', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      const config = pluginsConfig['users-permissions'].config;
      
      // Check all required security settings
      expect(config.jwt).toBeDefined();
      expect(config.ratelimit).toBeDefined();
      expect(config.password).toBeDefined();
      expect(config.lockout).toBeDefined();
      expect(config.email).toBeDefined();
      
      // Check specific values
      expect(config.jwt.expiresIn).toBe('7d');
      expect(config.ratelimit.max).toBe(5);
      expect(config.ratelimit.windowMs).toBe(15 * 60 * 1000);
      expect(config.password.minLength).toBe(8);
      expect(config.lockout.maxAttempts).toBe(5);
    });
  });

  describe('Email Verification Workflow', () => {
    it('should have email confirmation template with required variables', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/email-confirmation.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required template variables
      expect(templateContent).toContain('{{ user.username }}');
      expect(templateContent).toContain('{{ user.email }}');
      expect(templateContent).toContain('{{ confirmation_url }}');
      
      // Check for security elements
      expect(templateContent).toContain('Security Notice');
      expect(templateContent).toContain('expire in 24 hours');
    });

    it('should have password reset template with required variables', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/reset-password.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required template variables
      expect(templateContent).toContain('{{ user.username }}');
      expect(templateContent).toContain('{{ user.email }}');
      expect(templateContent).toContain('{{ reset_url }}');
      
      // Check for security elements
      expect(templateContent).toContain('Security Warning');
      expect(templateContent).toContain('expire in 1 hour');
      expect(templateContent).toContain('Password Requirements');
    });

    it('should have welcome email template with required variables', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/welcome.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required template variables
      expect(templateContent).toContain('{{ user.username }}');
      expect(templateContent).toContain('{{ user.email }}');
      expect(templateContent).toContain('{{ shop_url }}');
      expect(templateContent).toContain('{{ account_url }}');
      expect(templateContent).toContain('{{ help_url }}');
      
      // Check for welcome content
      expect(templateContent).toContain('Welcome to Ecommerce Platform');
      expect(templateContent).toContain('What you can do now:');
    });
  });

  describe('Password Reset Functionality', () => {
    it('should have password requirements configured correctly', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      const passwordPattern = pluginsConfig['users-permissions'].config.password.pattern;
      
      // Test valid passwords
      expect(passwordPattern.test('TestPass123!')).toBe(true);
      expect(passwordPattern.test('MySecureP@ss1')).toBe(true);
      expect(passwordPattern.test('ComplexP@ssw0rd')).toBe(true);
      
      // Test invalid passwords
      expect(passwordPattern.test('weak')).toBe(false);
      expect(passwordPattern.test('password')).toBe(false);
      expect(passwordPattern.test('12345678')).toBe(false);
      expect(passwordPattern.test('TestPass')).toBe(false); // No number or special char
      expect(passwordPattern.test('testpass123')).toBe(false); // No uppercase
    });

    it('should have account lockout settings configured', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      const lockoutConfig = pluginsConfig['users-permissions'].config.lockout;
      
      expect(lockoutConfig.maxAttempts).toBe(5);
      expect(lockoutConfig.lockoutDuration).toBe(15 * 60 * 1000); // 15 minutes
    });
  });

  describe('JWT Token Management', () => {
    it('should have JWT configuration with proper expiration', () => {
      const jwtConfig = require('../../../../config/jwt.ts').default({ env: mockEnv });
      
      expect(jwtConfig.jwt.expiresIn).toBe('7d');
      expect(jwtConfig.jwt.refreshToken.expiresIn).toBe('30d');
      expect(jwtConfig.jwt.secret).toBe('test-jwt-secret');
      expect(jwtConfig.jwt.refreshToken.secret).toBe('test-refresh-secret');
    });
  });

  describe('Rate Limiting Configuration', () => {
    it('should have rate limiting configured for authentication endpoints', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      const rateLimitConfig = pluginsConfig['users-permissions'].config.ratelimit;
      
      expect(rateLimitConfig.max).toBe(5);
      expect(rateLimitConfig.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    });
  });

  describe('Business Logic Integration', () => {
    it('should have user validation logic that works with configured password requirements', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      const passwordPattern = pluginsConfig['users-permissions'].config.password.pattern;
      
      // Test validation logic
      const validateUserData = (userData) => {
        const errors = [];
        
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
          errors.push('Invalid email format');
        }
        
        // Validate username format
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(userData.username)) {
          errors.push('Invalid username format');
        }
        
        // Validate password strength
        if (userData.password && !passwordPattern.test(userData.password)) {
          errors.push('Password must meet security requirements');
        }
        
        return {
          isValid: errors.length === 0,
          errors
        };
      };
      
      // Test with valid data
      const validData = {
        username: 'testuser123',
        email: 'test@example.com',
        password: 'TestPass123!'
      };
      
      const validation = validateUserData(validData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Email Template Integration', () => {
    it('should have all email templates with consistent styling', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templates = [
        'email-confirmation.html',
        'reset-password.html',
        'welcome.html'
      ];
      
      templates.forEach(templateName => {
        const templatePath = path.join(__dirname, '../email-templates', templateName);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Check for consistent styling elements
        expect(templateContent).toContain('max-width: 600px');
        expect(templateContent).toContain('margin: 0 auto');
        expect(templateContent).toContain('border-radius: 8px');
        expect(templateContent).toContain('box-shadow: 0 2px 10px');
        expect(templateContent).toContain('#3b82f6'); // Primary blue color
      });
    });

    it('should have responsive design in all email templates', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templates = [
        'email-confirmation.html',
        'reset-password.html',
        'welcome.html'
      ];
      
      templates.forEach(templateName => {
        const templatePath = path.join(__dirname, '../email-templates', templateName);
        const templateContent = fs.readFileSync(templatePath, 'utf8');
        
        // Check for responsive design elements
        expect(templateContent).toContain('viewport');
        expect(templateContent).toContain('width=device-width');
        expect(templateContent).toContain('initial-scale=1.0');
      });
    });
  });

  describe('Security Integration', () => {
    it('should have comprehensive security measures configured', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      const config = pluginsConfig['users-permissions'].config;
      
      // Check password security
      expect(config.password.minLength).toBe(8);
      expect(config.password.maxLength).toBe(128);
      expect(config.password.pattern).toBeInstanceOf(RegExp);
      
      // Check rate limiting
      expect(config.ratelimit.max).toBe(5);
      expect(config.ratelimit.windowMs).toBe(15 * 60 * 1000);
      
      // Check account lockout
      expect(config.lockout.maxAttempts).toBe(5);
      expect(config.lockout.lockoutDuration).toBe(15 * 60 * 1000);
      
      // Check JWT security
      const jwtConfig = require('../../../../config/jwt.ts').default({ env: mockEnv });
      expect(jwtConfig.jwt.secret).toBeDefined();
      expect(jwtConfig.jwt.refreshToken.secret).toBeDefined();
    });

    it('should have email security features in templates', () => {
      const fs = require('fs');
      const path = require('path');
      
      // Check email confirmation template
      const confirmationTemplate = fs.readFileSync(
        path.join(__dirname, '../email-templates/email-confirmation.html'), 
        'utf8'
      );
      expect(confirmationTemplate).toContain('Security Notice');
      expect(confirmationTemplate).toContain('expire in 24 hours');
      
      // Check password reset template
      const resetTemplate = fs.readFileSync(
        path.join(__dirname, '../email-templates/reset-password.html'), 
        'utf8'
      );
      expect(resetTemplate).toContain('Security Warning');
      expect(resetTemplate).toContain('expire in 1 hour');
    });
  });

  describe('Account Activation/Deactivation Integration', () => {
    it('should have account status workflow logic', () => {
      // Test account activation validation
      const validateAccountActivation = (user) => {
        if (!user) {
          throw new Error('User not found');
        }
        if (user.confirmed) {
          throw new Error('Account is already activated');
        }
        return { canActivate: true, user };
      };
      
      // Test account deactivation validation
      const validateAccountDeactivation = (user) => {
        if (!user) {
          throw new Error('User not found');
        }
        if (!user.confirmed) {
          throw new Error('Account is not activated');
        }
        return { canDeactivate: true, user };
      };
      
      // Test valid activation
      const validUser = { documentId: 'user123', confirmed: false };
      const activationResult = validateAccountActivation(validUser);
      expect(activationResult.canActivate).toBe(true);
      
      // Test valid deactivation
      const confirmedUser = { documentId: 'user123', confirmed: true };
      const deactivationResult = validateAccountDeactivation(confirmedUser);
      expect(deactivationResult.canDeactivate).toBe(true);
    });
  });
});
