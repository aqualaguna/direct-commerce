/**
 * Email Template Rendering Tests
 * 
 * Tests for custom email template rendering functionality
 */

const fs = require('fs');
const path = require('path');

// Mock template rendering function
const renderTemplate = (templatePath, variables) => {
  let content = fs.readFileSync(templatePath, 'utf8');
  
  // Replace template variables with actual values
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{ ${key} }}`, 'g');
    content = content.replace(regex, variables[key]);
  });
  
  return content;
};

describe('Email Template Rendering', () => {
  const templatesDir = path.join(__dirname, '../email-templates');
  
  describe('Email Confirmation Template', () => {
    it('should render email confirmation template with user data', () => {
      const templatePath = path.join(templatesDir, 'email-confirmation.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'confirmation_url': 'https://example.com/confirm?token=abc123'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('Hello <strong>testuser</strong>');
      expect(rendered).toContain('test@example.com');
      expect(rendered).toContain('https://example.com/confirm?token=abc123');
      expect(rendered).toContain('Confirm Your Email Address');
      expect(rendered).toContain('Security Notice');
    });

    it('should include proper HTML structure in rendered template', () => {
      const templatePath = path.join(templatesDir, 'email-confirmation.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'confirmation_url': 'https://example.com/confirm?token=abc123'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      // Check for proper HTML structure
      expect(rendered).toContain('<!DOCTYPE html>');
      expect(rendered).toContain('<html lang="en">');
      expect(rendered).toContain('<head>');
      expect(rendered).toContain('<body>');
      expect(rendered).toContain('</html>');
      
      // Check for CSS styles
      expect(rendered).toContain('<style>');
      expect(rendered).toContain('font-family:');
      expect(rendered).toContain('background-color:');
    });

    it('should include security elements in rendered template', () => {
      const templatePath = path.join(templatesDir, 'email-confirmation.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'confirmation_url': 'https://example.com/confirm?token=abc123'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('Security Notice');
      expect(rendered).toContain('expire in 24 hours');
      expect(rendered).toContain('If you didn\'t create this account');
    });
  });

  describe('Password Reset Template', () => {
    it('should render password reset template with user data', () => {
      const templatePath = path.join(templatesDir, 'reset-password.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'reset_url': 'https://example.com/reset?token=xyz789'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('Hello <strong>testuser</strong>');
      expect(rendered).toContain('test@example.com');
      expect(rendered).toContain('https://example.com/reset?token=xyz789');
      expect(rendered).toContain('Reset Your Password');
      expect(rendered).toContain('Security Warning');
    });

    it('should include password requirements in rendered template', () => {
      const templatePath = path.join(templatesDir, 'reset-password.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'reset_url': 'https://example.com/reset?token=xyz789'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('Password Requirements');
      expect(rendered).toContain('At least 8 characters long');
      expect(rendered).toContain('Include uppercase and lowercase letters');
      expect(rendered).toContain('Include at least one number');
      expect(rendered).toContain('Include at least one special character');
    });

    it('should include step-by-step instructions in rendered template', () => {
      const templatePath = path.join(templatesDir, 'reset-password.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'reset_url': 'https://example.com/reset?token=xyz789'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('What happens next?');
      expect(rendered).toContain('Click the reset button above');
      expect(rendered).toContain('Enter your new password');
      expect(rendered).toContain('Confirm your new password');
    });
  });

  describe('Welcome Email Template', () => {
    it('should render welcome template with user data', () => {
      const templatePath = path.join(templatesDir, 'welcome.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'shop_url': 'https://example.com/shop',
        'account_url': 'https://example.com/account',
        'help_url': 'https://example.com/help'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('Hello <strong>testuser</strong>');
      expect(rendered).toContain('test@example.com');
      expect(rendered).toContain('Welcome to Ecommerce Platform');
      expect(rendered).toContain('Start Shopping');
    });

    it('should include feature list in rendered template', () => {
      const templatePath = path.join(templatesDir, 'welcome.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'shop_url': 'https://example.com/shop',
        'account_url': 'https://example.com/account',
        'help_url': 'https://example.com/help'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('What you can do now:');
      expect(rendered).toContain('Browse our extensive product catalog');
      expect(rendered).toContain('Add items to your wishlist');
      expect(rendered).toContain('Save your shipping addresses');
      expect(rendered).toContain('Track your order history');
      expect(rendered).toContain('Receive personalized recommendations');
      expect(rendered).toContain('Get exclusive member-only deals');
    });

    it('should include quick links in rendered template', () => {
      const templatePath = path.join(templatesDir, 'welcome.html');
      const variables = {
        'user.username': 'testuser',
        'user.email': 'test@example.com',
        'shop_url': 'https://example.com/shop',
        'account_url': 'https://example.com/account',
        'help_url': 'https://example.com/help'
      };
      
      const rendered = renderTemplate(templatePath, variables);
      
      expect(rendered).toContain('Quick Links');
      expect(rendered).toContain('Shop Now');
      expect(rendered).toContain('My Account');
      expect(rendered).toContain('Help Center');
    });
  });

  describe('Template Responsive Design', () => {
    it('should have responsive design elements in all templates', () => {
      const templates = [
        'email-confirmation.html',
        'reset-password.html',
        'welcome.html'
      ];
      
      templates.forEach(templateName => {
        const templatePath = path.join(templatesDir, templateName);
        const content = fs.readFileSync(templatePath, 'utf8');
        
        // Check for responsive design elements
        expect(content).toContain('max-width: 600px');
        expect(content).toContain('margin: 0 auto');
        expect(content).toContain('padding: 20px');
        expect(content).toContain('border-radius: 8px');
        expect(content).toContain('box-shadow: 0 2px 10px');
      });
    });

    it('should have proper color scheme in all templates', () => {
      const templates = [
        'email-confirmation.html',
        'reset-password.html',
        'welcome.html'
      ];
      
      templates.forEach(templateName => {
        const templatePath = path.join(templatesDir, templateName);
        const content = fs.readFileSync(templatePath, 'utf8');
        
        // Check for consistent color scheme
        expect(content).toContain('#3b82f6'); // Primary blue
        expect(content).toContain('#ffffff'); // White
        expect(content).toContain('#f8f9fa'); // Light background
      });
    });
  });

  describe('Template Accessibility', () => {
    it('should have proper accessibility attributes in all templates', () => {
      const templates = [
        'email-confirmation.html',
        'reset-password.html',
        'welcome.html'
      ];
      
      templates.forEach(templateName => {
        const templatePath = path.join(templatesDir, templateName);
        const content = fs.readFileSync(templatePath, 'utf8');
        
        // Check for accessibility elements
        expect(content).toContain('lang="en"');
        expect(content).toContain('charset="UTF-8"');
        expect(content).toContain('viewport');
      });
    });

    it('should have proper semantic HTML structure', () => {
      const templates = [
        'email-confirmation.html',
        'reset-password.html',
        'welcome.html'
      ];
      
      templates.forEach(templateName => {
        const templatePath = path.join(templatesDir, templateName);
        const content = fs.readFileSync(templatePath, 'utf8');
        
        // Check for semantic HTML
        expect(content).toContain('<h1');
        expect(content).toContain('<p');
        expect(content).toContain('<div');
        expect(content).toContain('<a');
      });
    });
  });
});
