export enum UserType {
    ADMIN = 'admin',
    AUTHENTICATED = 'authenticated',
    PUBLIC = 'public',
    GUEST = 'guest',
    API_TOKEN = 'api_token',
}

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  test: {
    max: 1000,
    windowMs: 60 * 1000, // 1 minute
  },
  production: {
    max: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

// Password requirements
export const PASSWORD_CONFIG = {
  minLength: 8,
  maxLength: 128,
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
};

// Account lockout settings
export const LOCKOUT_CONFIG = {
  maxAttempts: 5,
  lockoutDuration: 15 * 60 * 1000, // 15 minutes
};

// JWT configuration
export const JWT_CONFIG = {
  expiresIn: '7d',
};

// Content types for different permission levels
export const CONTENT_TYPES = {
  public: [
    'api::category.category',
    'api::product-listing.product-listing',
    'api::address.address',
    'api::guest.guest',
  ],
  authenticated: [
    'api::user-activity.user-activity',
    'api::user-preference.user-preference',
    'api::privacy-setting.privacy-setting',
    'api::address.address',
  ],
  admin: [
    'api::payment-comment.payment-comment',
  ],
};

// Actions for different permission levels
export const ACTIONS = {
  public: ['find', 'findOne'],
  authenticated: ['find', 'findOne', 'create', 'update', 'delete'],
  admin: ['find', 'findOne', 'create', 'update', 'delete'],
};

// Custom permissions for public users
export const PUBLIC_CUSTOM_PERMISSIONS = [
  {
    action: 'api::user-behavior.user-behavior.track',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.addItem',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.getCurrentCart',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.clearCart',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.calculateTotals',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.migrateGuestCart',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.updateItem',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.removeItem',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.findByType',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getDefault',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.setAsDefault',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.search',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getStats',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.validate',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.validateForCountry',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getAddressBook',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.exportAddresses',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.importAddresses',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getAnalytics',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.delete',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::guest.guest.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::guest.guest.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::guest.guest.convertToUser',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.validateCheckout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.completeCheckout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.abandonCheckout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::payment.payment.createPayment',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::payment-method.payment-method.getActive',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::payment-method.payment-method.getByCode',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.cancelOrder',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.refundOrder',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.find',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.findOne',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.findByStatus',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.find',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.findOne',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.bulkCreate',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.getSessionSummary',
    subject: null,
    properties: {},
    conditions: [],
  },
];

// Custom permissions for authenticated users
export const AUTHENTICATED_CUSTOM_PERMISSIONS = [
  {
    action: 'api::user-preference.user-preference.getMyPreferences',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.user-preference.updateMyPreferences',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.user-preference.getMyPreferenceCategory',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.user-preference.updateMyPreferenceCategory',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.user-preference.resetMyPreferences',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.user-preference.exportMyPreferences',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.profile.getMyProfile',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.profile.getProfile',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.profile.updateMyProfile',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.profile.getProfileCompletion',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.profile.uploadProfilePicture',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-preference.profile.deleteProfilePicture',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::user-behavior.user-behavior.track',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.getMyPrivacySettings',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.updateMyPrivacySettings',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.updateMyConsent',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.getMyConsentHistory',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.resetMyPrivacySettings',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.exportMyData',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.requestDataDeletion',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::privacy-setting.privacy-setting.deleteMyData',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.findByType',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getDefault',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.setAsDefault',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.search',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getStats',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.validate',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.validateForCountry',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getAddressBook',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.exportAddresses',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.importAddresses',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::address.address.getAnalytics',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.addItem',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.getCurrentCart',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.clearCart',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.calculateTotals',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.migrateGuestCart',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.updateItem',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::cart.cart.removeItem',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.validateCheckout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.completeCheckout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout.checkout.abandonCheckout',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::payment.payment.createPayment',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::payment-comment.payment-comment.getCommentsByPayment',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'plugin::upload.upload',
    subject: null,
    properties: {},
    conditions: [],
  },

  {
    action: 'api::order.order.cancelOrder',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.refundOrder',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.find',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.findOne',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::order.order.findByStatus',
    subject: null,
    properties: {},
    conditions: [],
  },
  ,
  {
    action: 'api::checkout-activity.checkout-activity.find',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.findOne',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.create',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.update',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.bulkCreate',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.getSessionSummary',
    subject: null,
    properties: {},
    conditions: [],
  },
];

// Custom permissions for admin users
export const ADMIN_CUSTOM_PERMISSIONS = [
  {
    action: 'api::payment-comment.payment-comment.getCommentsByPayment',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::payment-comment.payment-comment.getStatistics',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'plugin::upload.content-api.upload',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'plugin::upload.content-api.destroy',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.cleanup',
    subject: null,
    properties: {},
    conditions: [],
  },
  {
    action: 'api::checkout-activity.checkout-activity.delete',
    subject: null,
    properties: {},
    conditions: [],
  },
];