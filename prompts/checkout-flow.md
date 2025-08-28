# Checkout Flow Design Prompt

## High-Level Goal
Create a streamlined checkout process that minimizes friction and builds trust for secure payment completion.

## Detailed Instructions
1. Design a multi-step checkout flow (Shipping → Payment → Review → Confirmation)
2. Create guest checkout option as the default
3. Design shipping address form with validation
4. Include payment method selection with security indicators
5. Create order summary with item details and totals
6. Add progress indicator showing checkout steps
7. Design order confirmation page with next steps

## Checkout Steps
- **Step 1 - Shipping:** Address form, shipping options, contact information
- **Step 2 - Payment:** Payment method selection, card details, billing address
- **Step 3 - Review:** Order summary, terms acceptance, final confirmation
- **Step 4 - Confirmation:** Order details, email confirmation, next steps

## Form Design
- **Input Fields:** Clean, modern design with clear labels and validation
- **Error States:** Red borders with helpful error messages
- **Success States:** Green checkmarks for completed sections
- **Required Fields:** Clear indication with asterisks
- **Auto-save:** Save progress automatically to prevent data loss

## Security & Trust
- **Security Badges:** SSL certificate, payment security icons
- **Progress Indicator:** Clear visual feedback on checkout progress
- **Order Summary:** Always visible with item details and totals
- **Terms & Conditions:** Clear checkbox with link to full terms
- **Contact Information:** Multiple ways to get help during checkout

## Visual Design
- **Primary Actions:** Maroon buttons (#8B2E3C) for continue/complete
- **Secondary Actions:** Outline buttons for back/edit
- **Form Fields:** Clean borders with focus states
- **Progress Bar:** Maroon progress indicator
- **Security Icons:** Trust badges and payment method logos

## Technical Requirements
- Implement real-time form validation
- Add auto-save functionality for form data
- Include keyboard navigation between steps
- Ensure mobile-optimized form inputs
- Add loading states for payment processing
