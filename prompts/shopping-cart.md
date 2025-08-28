# Shopping Cart Page Design Prompt

## High-Level Goal
Design a cart page that allows easy review and modification of items while encouraging checkout completion.

## Detailed Instructions
1. Create a cart item list with product images, titles, prices, and quantity controls
2. Design quantity adjustment controls with +/- buttons
3. Add remove item functionality with confirmation
4. Create a cart summary sidebar with subtotal, tax, and total
5. Include a promo code entry field
6. Design prominent "Proceed to Checkout" and "Continue Shopping" buttons
7. Add empty cart state with product recommendations

## Cart Item Design
- **Layout:** Product image (80px), product info, quantity controls, price, remove button
- **Quantity Controls:** +/- buttons with number input, minimum 1, maximum 99
- **Remove Button:** Small trash icon with confirmation modal
- **Price Updates:** Real-time calculation with smooth animations
- **Mobile Layout:** Stacked design with larger touch targets

## Visual Hierarchy
- **Cart Items:** White background with subtle borders
- **Summary Sidebar:** Light gray background, sticky on desktop
- **Total Price:** Large, bold typography in maroon color
- **Checkout Button:** Full-width maroon button (#8B2E3C) with white text
- **Continue Shopping:** Secondary button with outline style

## Interactive Elements
- **Quantity Changes:** Immediate visual feedback and total updates
- **Remove Items:** Confirmation modal with clear messaging
- **Promo Code:** Real-time validation with success/error states
- **Checkout Button:** Hover effects and loading states
- **Empty Cart:** Helpful messaging with product recommendations

## Technical Requirements
- Implement real-time price calculations
- Add form validation for quantity inputs
- Include keyboard shortcuts for quantity changes
- Ensure proper focus management for accessibility
- Optimize for mobile touch interactions
