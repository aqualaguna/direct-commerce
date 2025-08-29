/**
 * Email Service Integration Tests
 * 
 * Tests for email service integration with SendGrid provider
 */

// Mock env function for testing
const mockEnv = (key, defaultValue = '') => {
  const envVars = {
    'SENDGRID_API_KEY': 'test-sendgrid-api-key',
    'EMAIL_FROM': 'noreply@example.com',
    'EMAIL_REPLY_TO': 'support@example.com',
  };
  return envVars[key] || defaultValue;
};

describe('Email Service Integration', () => {
  describe('Email Provider Configuration', () => {
    it('should have SendGrid email provider configured', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      
      expect(pluginsConfig.email).toBeDefined();
      expect(pluginsConfig.email.config.provider).toBe('@strapi/provider-email-sendgrid');
    });

    it('should have SendGrid API key configured', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      
      expect(pluginsConfig.email.config.providerOptions.apiKey).toBe('test-sendgrid-api-key');
    });

    it('should have default from email configured', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      
      expect(pluginsConfig.email.config.providerOptions.defaultFrom).toBe('noreply@example.com');
    });

    it('should have default reply-to email configured', () => {
      const pluginsConfig = require('../../../../config/plugins.ts').default({ env: mockEnv });
      
      expect(pluginsConfig.email.config.providerOptions.defaultReplyTo).toBe('support@example.com');
    });
  });

  describe('Email Templates', () => {
    it('should have email confirmation template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/email-confirmation.html');
      expect(fs.existsSync(templatePath)).toBe(true);
      
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain('Confirm Your Email Address');
      expect(templateContent).toContain('{{ confirmation_url }}');
      expect(templateContent).toContain('{{ user.username }}');
    });

    it('should have password reset template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/reset-password.html');
      expect(fs.existsSync(templatePath)).toBe(true);
      
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain('Reset Your Password');
      expect(templateContent).toContain('{{ reset_url }}');
      expect(templateContent).toContain('{{ user.username }}');
    });

    it('should have welcome email template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/welcome.html');
      expect(fs.existsSync(templatePath)).toBe(true);
      
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      expect(templateContent).toContain('Welcome to Ecommerce Platform');
      expect(templateContent).toContain('{{ user.username }}');
    });
  });

  describe('Email Template Content Validation', () => {
    it('should have proper HTML structure in email confirmation template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/email-confirmation.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required HTML elements
      expect(templateContent).toContain('<!DOCTYPE html>');
      expect(templateContent).toContain('<html lang="en">');
      expect(templateContent).toContain('<head>');
      expect(templateContent).toContain('<body>');
      expect(templateContent).toContain('</html>');
      
      // Check for required template variables
      expect(templateContent).toContain('{{ confirmation_url }}');
      expect(templateContent).toContain('{{ user.username }}');
      expect(templateContent).toContain('{{ user.email }}');
    });

    it('should have proper HTML structure in password reset template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/reset-password.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required HTML elements
      expect(templateContent).toContain('<!DOCTYPE html>');
      expect(templateContent).toContain('<html lang="en">');
      expect(templateContent).toContain('<head>');
      expect(templateContent).toContain('<body>');
      expect(templateContent).toContain('</html>');
      
      // Check for required template variables
      expect(templateContent).toContain('{{ reset_url }}');
      expect(templateContent).toContain('{{ user.username }}');
      expect(templateContent).toContain('{{ user.email }}');
    });

    it('should have proper HTML structure in welcome template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/welcome.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Check for required HTML elements
      expect(templateContent).toContain('<!DOCTYPE html>');
      expect(templateContent).toContain('<html lang="en">');
      expect(templateContent).toContain('<head>');
      expect(templateContent).toContain('<body>');
      expect(templateContent).toContain('</html>');
      
      // Check for required template variables
      expect(templateContent).toContain('{{ user.username }}');
      expect(templateContent).toContain('{{ user.email }}');
    });
  });

  describe('Email Template Security', () => {
    it('should include security warnings in password reset template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/reset-password.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      expect(templateContent).toContain('Security Warning');
      expect(templateContent).toContain('expire in 1 hour');
      expect(templateContent).toContain('If you didn\'t request a password reset');
    });

    it('should include security notice in email confirmation template', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templatePath = path.join(__dirname, '../email-templates/email-confirmation.html');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      expect(templateContent).toContain('Security Notice');
      expect(templateContent).toContain('expire in 24 hours');
      expect(templateContent).toContain('If you didn\'t create this account');
    });
  });

  describe('Email Template Responsive Design', () => {
    it('should have responsive viewport meta tag', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templates = [
        '../email-templates/email-confirmation.html',
        '../email-templates/reset-password.html',
        '../email-templates/welcome.html'
      ];
      
      templates.forEach(templatePath => {
        const fullPath = path.join(__dirname, templatePath);
        const templateContent = fs.readFileSync(fullPath, 'utf8');
        
        expect(templateContent).toContain('viewport');
        expect(templateContent).toContain('width=device-width');
        expect(templateContent).toContain('initial-scale=1.0');
      });
    });

    it('should have mobile-friendly CSS styles', () => {
      const fs = require('fs');
      const path = require('path');
      
      const templates = [
        '../email-templates/email-confirmation.html',
        '../email-templates/reset-password.html',
        '../email-templates/welcome.html'
      ];
      
      templates.forEach(templatePath => {
        const fullPath = path.join(__dirname, templatePath);
        const templateContent = fs.readFileSync(fullPath, 'utf8');
        
        // Check for responsive design elements
        expect(templateContent).toContain('max-width: 600px');
        expect(templateContent).toContain('margin: 0 auto');
        expect(templateContent).toContain('padding: 20px');
      });
    });
  });
});
