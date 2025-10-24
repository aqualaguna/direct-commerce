import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiAddressAddress extends Struct.CollectionTypeSchema {
  collectionName: 'addresses';
  info: {
    description: 'Customer addresses for shipping and billing';
    displayName: 'Address';
    pluralName: 'addresses';
    singularName: 'address';
  };
  options: {
    comment: 'Address content type for customer address management';
    draftAndPublish: false;
  };
  attributes: {
    address1: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    address2: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    city: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    company: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    country: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    firstName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    isDefault: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lastName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::address.address'
    > &
      Schema.Attribute.Private;
    phone: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    postalCode: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String;
    state: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    type: Schema.Attribute.Enumeration<['shipping', 'billing', 'both']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiCartCart extends Struct.CollectionTypeSchema {
  collectionName: 'carts';
  info: {
    description: 'Shopping cart for ecommerce platform';
    displayName: 'Cart';
    pluralName: 'carts';
    singularName: 'cart';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
      }> &
      Schema.Attribute.DefaultTo<'USD'>;
    discountAmount: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    discountCode: Schema.Attribute.String;
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    items: Schema.Attribute.Relation<'oneToMany', 'api::cart.cart-item'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::cart.cart'> &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String;
    shipping: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    shippingAddress: Schema.Attribute.Relation<
      'manyToOne',
      'api::address.address'
    >;
    shippingMethod: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<['active', 'expired', 'converted']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    subtotal: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    tax: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    total: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiCartCartItem extends Struct.CollectionTypeSchema {
  collectionName: 'cart_items';
  info: {
    description: 'Individual items in shopping cart';
    displayName: 'Cart Item';
    pluralName: 'cart-items';
    singularName: 'cart-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    cart: Schema.Attribute.Relation<'manyToOne', 'api::cart.cart'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deletedAt: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::cart.cart-item'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text;
    price: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'> &
      Schema.Attribute.Required;
    productListing: Schema.Attribute.Relation<
      'manyToOne',
      'api::product-listing.product-listing'
    >;
    publishedAt: Schema.Attribute.DateTime;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    selectedOptions: Schema.Attribute.JSON;
    total: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    variant: Schema.Attribute.Relation<
      'manyToOne',
      'api::product-listing-variant.product-listing-variant'
    >;
  };
}

export interface ApiCategoryCategory extends Struct.CollectionTypeSchema {
  collectionName: 'categories';
  info: {
    description: 'Product categories with hierarchical structure';
    displayName: 'Category';
    pluralName: 'categories';
    singularName: 'category';
  };
  options: {
    comment: 'Category content type for product organization';
    draftAndPublish: false;
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'api::category.category'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.RichText;
    image: Schema.Attribute.Media<'images'>;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::category.category'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'api::category.category'>;
    products: Schema.Attribute.Relation<'oneToMany', 'api::product.product'>;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    slug: Schema.Attribute.UID<'name'> &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCheckoutActivityCheckoutActivity
  extends Struct.CollectionTypeSchema {
  collectionName: 'checkout_activities';
  info: {
    description: 'High-volume checkout activity tracking for analytics and optimization';
    displayName: 'Checkout Activity';
    pluralName: 'checkout-activities';
    singularName: 'checkout-activity';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    activityData: Schema.Attribute.JSON;
    activityType: Schema.Attribute.Enumeration<
      [
        'step_enter',
        'step_exit',
        'form_field_focus',
        'form_field_blur',
        'validation_error',
        'form_submit',
        'checkout_abandon',
        'checkout_complete',
      ]
    > &
      Schema.Attribute.Required;
    browser: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    checkout: Schema.Attribute.Relation<'manyToOne', 'api::checkout.checkout'> &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceType: Schema.Attribute.Enumeration<['desktop', 'mobile', 'tablet']>;
    fieldType: Schema.Attribute.Enumeration<
      ['text', 'email', 'select', 'checkbox', 'radio', 'textarea']
    >;
    formField: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    formType: Schema.Attribute.Enumeration<
      ['shipping', 'billing', 'payment', 'review']
    >;
    interactionType: Schema.Attribute.Enumeration<
      ['focus', 'blur', 'input', 'validation_error', 'validation_success']
    >;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::checkout-activity.checkout-activity'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    os: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    referrer: Schema.Attribute.Text;
    screenResolution: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    sessionId: Schema.Attribute.String;
    stepDuration: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    stepName: Schema.Attribute.Enumeration<
      ['cart', 'shipping', 'billing', 'payment', 'review', 'confirmation']
    >;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    userAgent: Schema.Attribute.Text;
    utmCampaign: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmMedium: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    utmSource: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
  };
}

export interface ApiCheckoutCheckout extends Struct.CollectionTypeSchema {
  collectionName: 'checkouts';
  info: {
    description: 'Multi-step checkout management for guest and registered users';
    displayName: 'Checkout';
    pluralName: 'checkouts';
    singularName: 'checkout';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    abandonedAt: Schema.Attribute.DateTime;
    billingAddress: Schema.Attribute.Relation<
      'manyToOne',
      'api::address.address'
    >;
    completedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::checkout.checkout'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    order: Schema.Attribute.Relation<'oneToOne', 'api::order.order'>;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String;
    shippingAddress: Schema.Attribute.Relation<
      'manyToOne',
      'api::address.address'
    >;
    shippingMethod: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    status: Schema.Attribute.Enumeration<
      ['active', 'completed', 'abandoned', 'locked', 'expired']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiEngagementMetricsEngagementMetric
  extends Struct.CollectionTypeSchema {
  collectionName: 'engagement_metrics';
  info: {
    description: 'Track user engagement metrics and retention rates';
    displayName: 'Engagement Metrics';
    pluralName: 'engagement-metrics';
    singularName: 'engagement-metric';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    calculationDate: Schema.Attribute.DateTime & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::engagement-metrics.engagement-metric'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    metricType: Schema.Attribute.Enumeration<
      [
        'daily_active',
        'weekly_active',
        'monthly_active',
        'retention',
        'engagement_score',
        'session_duration',
        'page_views',
        'bounce_rate',
        'conversion_rate',
        'time_on_site',
      ]
    > &
      Schema.Attribute.Required;
    metricValue: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    periodEnd: Schema.Attribute.DateTime & Schema.Attribute.Required;
    periodStart: Schema.Attribute.DateTime & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Enumeration<
      ['user_activity', 'user_behavior', 'calculated', 'imported']
    > &
      Schema.Attribute.DefaultTo<'calculated'>;
    status: Schema.Attribute.Enumeration<['active', 'archived', 'invalid']> &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiGuestGuest extends Struct.CollectionTypeSchema {
  collectionName: 'guests';
  info: {
    description: 'Guest data for non-registered users';
    displayName: 'Guest';
    pluralName: 'guests';
    singularName: 'guest';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    convertedAt: Schema.Attribute.DateTime;
    convertedToUser: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::guest.guest'> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    status: Schema.Attribute.Enumeration<['active', 'converted']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiInventoryHistoryInventoryHistory
  extends Struct.CollectionTypeSchema {
  collectionName: 'inventory_histories';
  info: {
    description: 'Audit trail for all inventory changes';
    displayName: 'Inventory History';
    pluralName: 'inventory-histories';
    singularName: 'inventory-history';
  };
  options: {
    comment: 'Comprehensive audit trail for inventory management';
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Enumeration<
      ['increase', 'decrease', 'reserve', 'release', 'adjust', 'initialize']
    > &
      Schema.Attribute.Required;
    changedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::inventory-history.inventory-history'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    orderId: Schema.Attribute.String;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    quantityAfter: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    quantityBefore: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    quantityChanged: Schema.Attribute.Integer & Schema.Attribute.Required;
    reason: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    reservedAfter: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    reservedBefore: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    source: Schema.Attribute.Enumeration<
      ['manual', 'order', 'return', 'adjustment', 'system']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'manual'>;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiInventoryInventory extends Struct.CollectionTypeSchema {
  collectionName: 'inventories';
  info: {
    description: 'Inventory tracking and management for products';
    displayName: 'Inventory';
    pluralName: 'inventories';
    singularName: 'inventory';
  };
  options: {
    comment: 'Inventory management system with tracking, alerts, and audit trail';
    draftAndPublish: false;
  };
  attributes: {
    available: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isLowStock: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    lastUpdated: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::inventory.inventory'
    > &
      Schema.Attribute.Private;
    lowStockThreshold: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<10>;
    notes: Schema.Attribute.Text;
    product: Schema.Attribute.Relation<'oneToOne', 'api::product.product'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    reserved: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOptionGroupOptionGroup extends Struct.CollectionTypeSchema {
  collectionName: 'option_groups';
  info: {
    description: 'Option groups for product variants (e.g., Size, Color, Material)';
    displayName: 'Option Group';
    pluralName: 'option-groups';
    singularName: 'option-group';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    displayName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::option-group.option-group'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
        minLength: 1;
      }>;
    optionValues: Schema.Attribute.Relation<
      'oneToMany',
      'api::option-value.option-value'
    >;
    productListings: Schema.Attribute.Relation<
      'manyToMany',
      'api::product-listing.product-listing'
    >;
    publishedAt: Schema.Attribute.DateTime;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    type: Schema.Attribute.Enumeration<['select', 'radio']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'select'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOptionValueOptionValue extends Struct.CollectionTypeSchema {
  collectionName: 'option_values';
  info: {
    description: 'Specific option values for product variants (e.g., Large, Red, Cotton)';
    displayName: 'Option Value';
    pluralName: 'option-values';
    singularName: 'option-value';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    displayName: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::option-value.option-value'
    > &
      Schema.Attribute.Private;
    optionGroup: Schema.Attribute.Relation<
      'manyToOne',
      'api::option-group.option-group'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    sortOrder: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
        minLength: 1;
      }>;
    variants: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-listing-variant.product-listing-variant'
    >;
  };
}

export interface ApiOrderOrder extends Struct.CollectionTypeSchema {
  collectionName: 'orders';
  info: {
    description: 'Ecommerce orders with comprehensive management';
    displayName: 'Order';
    pluralName: 'orders';
    singularName: 'order';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    actualDelivery: Schema.Attribute.DateTime;
    adminNotes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    billingAddress: Schema.Attribute.Relation<
      'manyToOne',
      'api::address.address'
    > &
      Schema.Attribute.Required;
    checkout: Schema.Attribute.Relation<'oneToOne', 'api::checkout.checkout'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
      }> &
      Schema.Attribute.DefaultTo<'USD'>;
    customerNotes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    discount: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    estimatedDelivery: Schema.Attribute.DateTime;
    fraudScore: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    giftMessage: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    isGift: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    items: Schema.Attribute.Relation<'oneToMany', 'api::order.order-item'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::order.order'> &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    orderNumber: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
        minLength: 1;
      }>;
    orderSource: Schema.Attribute.Enumeration<
      ['web', 'mobile', 'admin', 'api']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'web'>;
    payments: Schema.Attribute.Relation<'oneToMany', 'api::payment.payment'>;
    paymentStatus: Schema.Attribute.Enumeration<
      ['pending', 'paid', 'failed', 'refunded', 'cancelled']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String;
    shipping: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    shippingAddress: Schema.Attribute.Relation<
      'manyToOne',
      'api::address.address'
    > &
      Schema.Attribute.Required;
    shippingMethod: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    status: Schema.Attribute.Enumeration<
      [
        'pending',
        'confirmed',
        'processing',
        'shipping',
        'delivered',
        'returned',
        'cancelled',
        'refunded',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    statusHistory: Schema.Attribute.Relation<
      'oneToMany',
      'api::order.order-status'
    >;
    subtotal: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    tax: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    total: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    trackingNumber: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiOrderOrderHistory extends Struct.CollectionTypeSchema {
  collectionName: 'order_histories';
  info: {
    description: 'Order history tracking and audit trail';
    displayName: 'Order History';
    pluralName: 'order-histories';
    singularName: 'order-history';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    affectedFields: Schema.Attribute.JSON;
    automatedAction: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    changedBy: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    changeReason: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    changeSource: Schema.Attribute.Enumeration<
      [
        'customer',
        'admin',
        'system',
        'payment_gateway',
        'shipping_carrier',
        'fraud_detection',
        'webhook',
        'api_token',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    eventType: Schema.Attribute.Enumeration<
      [
        'order_created',
        'status_changed',
        'payment_updated',
        'shipping_updated',
        'item_modified',
        'address_changed',
        'notes_updated',
        'tracking_updated',
        'refund_processed',
        'cancellation_requested',
        'fraud_flag_raised',
        'admin_action',
        'system_action',
      ]
    > &
      Schema.Attribute.Required;
    followUpNotes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    isCustomerVisible: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::order.order-history'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    newValue: Schema.Attribute.JSON;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'> &
      Schema.Attribute.Required;
    previousValue: Schema.Attribute.JSON;
    priority: Schema.Attribute.Enumeration<
      ['low', 'normal', 'high', 'critical']
    > &
      Schema.Attribute.DefaultTo<'normal'>;
    publishedAt: Schema.Attribute.DateTime;
    relatedEvents: Schema.Attribute.JSON;
    requiresFollowUp: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    sessionId: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userAgent: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

export interface ApiOrderOrderItem extends Struct.CollectionTypeSchema {
  collectionName: 'order_items';
  info: {
    description: 'Individual items within an order';
    displayName: 'Order Item';
    pluralName: 'order-items';
    singularName: 'order-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isDigital: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::order.order-item'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'>;
    price: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'> &
      Schema.Attribute.Required;
    productListing: Schema.Attribute.Relation<
      'manyToOne',
      'api::product-listing.product-listing'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
    subtotal: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    tax: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    variant: Schema.Attribute.Relation<
      'manyToOne',
      'api::product-listing-variant.product-listing-variant'
    >;
  };
}

export interface ApiOrderOrderStatus extends Struct.CollectionTypeSchema {
  collectionName: 'order_statuses';
  info: {
    description: 'Order status history and tracking';
    displayName: 'Order Status';
    pluralName: 'order-statuses';
    singularName: 'order-status';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    automatedTrigger: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customerVisible: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    expectedDuration: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    internalStatus: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::order.order-status'
    > &
      Schema.Attribute.Private;
    notes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    notificationMethod: Schema.Attribute.Enumeration<
      ['email', 'sms', 'push', 'none']
    >;
    notificationSent: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'> &
      Schema.Attribute.Required;
    previousStatus: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    priority: Schema.Attribute.Enumeration<
      ['low', 'normal', 'high', 'urgent']
    > &
      Schema.Attribute.DefaultTo<'normal'>;
    publishedAt: Schema.Attribute.DateTime;
    relatedEvents: Schema.Attribute.JSON;
    status: Schema.Attribute.Enumeration<
      [
        'pending',
        'confirmed',
        'processing',
        'shipping',
        'delivered',
        'cancelled',
        'refunded',
        'returned',
      ]
    > &
      Schema.Attribute.Required;
    statusReason: Schema.Attribute.Enumeration<
      [
        'customer_request',
        'payment_failed',
        'out_of_stock',
        'fraud_detected',
        'admin_action',
        'system_auto',
        'shipping_issue',
      ]
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOrderOrderTracking extends Struct.CollectionTypeSchema {
  collectionName: 'order_trackings';
  info: {
    description: 'Order tracking and shipment updates';
    displayName: 'Order Tracking';
    pluralName: 'order-trackings';
    singularName: 'order-tracking';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    actualDelivery: Schema.Attribute.DateTime;
    carrier: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }>;
    carrierCode: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currentLocation: Schema.Attribute.Component<'shared.location', false>;
    deliveryNotes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    estimatedDelivery: Schema.Attribute.DateTime;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    lastRetryAt: Schema.Attribute.DateTime;
    lastUpdate: Schema.Attribute.DateTime;
    lastUpdateSource: Schema.Attribute.Enumeration<
      ['carrier_api', 'webhook', 'manual', 'email', 'sms']
    > &
      Schema.Attribute.DefaultTo<'manual'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::order.order-tracking'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    nextRetryAt: Schema.Attribute.DateTime;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'> &
      Schema.Attribute.Required;
    packageDimensions: Schema.Attribute.JSON;
    packageWeight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    retryCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      > &
      Schema.Attribute.DefaultTo<0>;
    shipmentDate: Schema.Attribute.DateTime;
    signatureName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    signatureRequired: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    status: Schema.Attribute.Enumeration<
      [
        'pending',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'failed',
        'returned',
        'lost',
        'damaged',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    trackingNumber: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    trackingUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    updateHistory: Schema.Attribute.JSON;
    webhookSecret: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    webhookUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
  };
}

export interface ApiPaymentCommentPaymentComment
  extends Struct.CollectionTypeSchema {
  collectionName: 'payment_comments';
  info: {
    description: 'Comments for payments';
    displayName: 'Payment Comment';
    pluralName: 'payment-comments';
    singularName: 'payment-comment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attachments: Schema.Attribute.Media<'images' | 'files' | 'videos', true>;
    author: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    content: Schema.Attribute.Text &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 2000;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    isInternal: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment-comment.payment-comment'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    payment: Schema.Attribute.Relation<'manyToOne', 'api::payment.payment'>;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<
      ['admin', 'system', 'gateway', 'internal', 'warning', 'info']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'admin'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPaymentMethodPaymentMethod
  extends Struct.CollectionTypeSchema {
  collectionName: 'payment_methods';
  info: {
    description: 'Payment methods for manual and automated payments';
    displayName: 'Payment Method';
    pluralName: 'payment-methods';
    singularName: 'payment-method';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    code: Schema.Attribute.Enumeration<
      [
        'cash',
        'bank_transfer',
        'check',
        'money_order',
        'digital_wallet',
        'crypto_currency',
        'gift_card',
        'loyalty_card',
        'store_credit',
        'subscription',
        'reward_points',
        'promotional_code',
        'credit_card',
        'debit_card',
        'payment_app',
        'qris',
        'payment_gateway',
        'manual_payment',
        'other',
      ]
    > &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text & Schema.Attribute.Required;
    gatewayCode: Schema.Attribute.String;
    instructions: Schema.Attribute.Text;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment-method.payment-method'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    payments: Schema.Attribute.Relation<'oneToMany', 'api::payment.payment'>;
    paymentType: Schema.Attribute.Enumeration<['manual', 'automated']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'manual'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPaymentPayment extends Struct.CollectionTypeSchema {
  collectionName: 'payments';
  info: {
    description: 'Payment records for order processing';
    displayName: 'Payment';
    pluralName: 'payments';
    singularName: 'payment';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    adminNotes: Schema.Attribute.Text;
    amount: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
      }> &
      Schema.Attribute.DefaultTo<'USD'>;
    gatewayId: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment.payment'
    > &
      Schema.Attribute.Private;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'> &
      Schema.Attribute.Required;
    paymentComments: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment-comment.payment-comment'
    >;
    paymentConfirmation: Schema.Attribute.Relation<
      'oneToOne',
      'api::payment.payment-confirmation'
    >;
    paymentMethod: Schema.Attribute.Relation<
      'manyToOne',
      'api::payment-method.payment-method'
    > &
      Schema.Attribute.Required;
    paymentNotes: Schema.Attribute.Text;
    paymentType: Schema.Attribute.Enumeration<['manual', 'automated']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'manual'>;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['pending', 'confirmed', 'expired', 'rejected', 'refunded']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiPaymentPaymentConfirmation
  extends Struct.CollectionTypeSchema {
  collectionName: 'payment_confirmations';
  info: {
    description: 'Payment confirmation records for manual payment approval workflow';
    displayName: 'Payment Confirmation';
    pluralName: 'payment-confirmations';
    singularName: 'payment-confirmation';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    attachments: Schema.Attribute.Media<'images' | 'videos' | 'files', true>;
    automationRules: Schema.Attribute.JSON;
    confirmationEvidence: Schema.Attribute.JSON;
    confirmationHistory: Schema.Attribute.JSON;
    confirmationMethod: Schema.Attribute.Enumeration<
      [
        'admin_dashboard',
        'api_call',
        'webhook',
        'email_confirmation',
        'phone_confirmation',
      ]
    > &
      Schema.Attribute.DefaultTo<'admin_dashboard'>;
    confirmationNotes: Schema.Attribute.Text;
    confirmationStatus: Schema.Attribute.Enumeration<
      ['pending', 'confirmed', 'failed', 'cancelled']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'pending'>;
    confirmationType: Schema.Attribute.Enumeration<['manual', 'automated']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'manual'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::payment.payment-confirmation'
    > &
      Schema.Attribute.Private;
    nextRetryAt: Schema.Attribute.DateTime;
    payment: Schema.Attribute.Relation<'oneToOne', 'api::payment.payment'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    retryCount: Schema.Attribute.Integer & Schema.Attribute.DefaultTo<0>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiPrivacySettingPrivacySetting
  extends Struct.CollectionTypeSchema {
  collectionName: 'privacy_settings';
  info: {
    description: 'User privacy settings, data preferences, and GDPR compliance with consent tracking';
    displayName: 'Privacy Setting';
    pluralName: 'privacy-settings';
    singularName: 'privacy-setting';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    analyticsConsent: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    consentSource: Schema.Attribute.Enumeration<
      [
        'registration',
        'profile-update',
        'admin-update',
        'api',
        'consent-update',
      ]
    > &
      Schema.Attribute.DefaultTo<'registration'>;
    consentVersion: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }> &
      Schema.Attribute.DefaultTo<'1.0'>;
    cookieConsent: Schema.Attribute.Enumeration<
      ['necessary', 'analytics', 'marketing', 'all']
    > &
      Schema.Attribute.DefaultTo<'necessary'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    dataExportRequested: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    dataProcessingConsent: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    dataRetentionConsent: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    dataSharing: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    gdprConsent: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    ipAddressAtConsent: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    lastConsentUpdate: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::privacy-setting.privacy-setting'
    > &
      Schema.Attribute.Private;
    marketingConsent: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    profileVisibility: Schema.Attribute.Enumeration<
      ['public', 'private', 'friends']
    > &
      Schema.Attribute.DefaultTo<'private'>;
    publishedAt: Schema.Attribute.DateTime;
    rightToBeForgetRequested: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    showEmail: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    showLocation: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    showPhone: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    thirdPartySharing: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    >;
    userAgentAtConsent: Schema.Attribute.Text;
  };
}

export interface ApiProductListingVariantProductListingVariant
  extends Struct.CollectionTypeSchema {
  collectionName: 'product_listing_variants';
  info: {
    description: 'Product variants with specific options, pricing, and inventory';
    displayName: 'Product Listing Variant';
    pluralName: 'product-listing-variants';
    singularName: 'product-listing-variant';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    basePrice: Schema.Attribute.Decimal &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    discountPrice: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    images: Schema.Attribute.Media<'images'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-listing-variant.product-listing-variant'
    > &
      Schema.Attribute.Private;
    optionValue: Schema.Attribute.Relation<
      'manyToOne',
      'api::option-value.option-value'
    > &
      Schema.Attribute.Required;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'> &
      Schema.Attribute.Required;
    productListing: Schema.Attribute.Relation<
      'manyToOne',
      'api::product-listing.product-listing'
    > &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiProductListingProductListing
  extends Struct.CollectionTypeSchema {
  collectionName: 'product_listings';
  info: {
    description: 'Customer-facing product representations with variants support';
    displayName: 'Product Listing';
    pluralName: 'product-listings';
    singularName: 'product-listing';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    basePrice: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    category: Schema.Attribute.Relation<'manyToOne', 'api::category.category'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.RichText & Schema.Attribute.Required;
    discountPrice: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    featured: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    images: Schema.Attribute.Media<'images', true> &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-listing.product-listing'
    > &
      Schema.Attribute.Private;
    optionGroups: Schema.Attribute.Relation<
      'manyToMany',
      'api::option-group.option-group'
    >;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'>;
    publishedAt: Schema.Attribute.DateTime;
    seo: Schema.Attribute.Component<'shared.seo', false>;
    shortDescription: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    slug: Schema.Attribute.UID<'title'> & Schema.Attribute.Required;
    title: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    type: Schema.Attribute.Enumeration<['single', 'variant']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'single'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    variants: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-listing-variant.product-listing-variant'
    >;
    wishlistedBy: Schema.Attribute.Relation<
      'manyToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiProductProduct extends Struct.CollectionTypeSchema {
  collectionName: 'products';
  info: {
    description: 'Base product entity - source of truth for product data';
    displayName: 'Product';
    pluralName: 'products';
    singularName: 'product';
  };
  options: {
    comment: 'Base product entity - website-facing attributes moved to ProductListing';
    draftAndPublish: false;
  };
  attributes: {
    brand: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    category: Schema.Attribute.Relation<'manyToOne', 'api::category.category'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    height: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    inventoryRecord: Schema.Attribute.Relation<
      'oneToOne',
      'api::inventory.inventory'
    >;
    length: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::product.product'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    productListings: Schema.Attribute.Relation<
      'oneToMany',
      'api::product-listing.product-listing'
    >;
    publishedAt: Schema.Attribute.DateTime;
    sku: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    status: Schema.Attribute.Enumeration<['draft', 'active', 'inactive']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'draft'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    weight: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    width: Schema.Attribute.Decimal &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
  };
}

export interface ApiSecurityEventSecurityEvent
  extends Struct.CollectionTypeSchema {
  collectionName: 'security_events';
  info: {
    description: 'Track security events and incidents for monitoring and alerting';
    displayName: 'Security Event';
    pluralName: 'security-events';
    singularName: 'security-event';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    attemptCount: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    eventData: Schema.Attribute.JSON;
    eventType: Schema.Attribute.Enumeration<
      [
        'failed_login',
        'suspicious_activity',
        'password_change',
        'account_lockout',
        'admin_action',
        'data_access',
        'permission_change',
        'api_abuse',
        'brute_force_attempt',
        'unusual_location',
        'multiple_sessions',
        'account_deletion',
      ]
    > &
      Schema.Attribute.Required;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::security-event.security-event'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    reason: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    resolutionNotes: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    resolved: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    resolvedAt: Schema.Attribute.DateTime;
    resolvedBy: Schema.Attribute.Relation<'manyToOne', 'admin::user'>;
    severity: Schema.Attribute.Enumeration<
      ['low', 'medium', 'high', 'critical']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'low'>;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    userAgent: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
  };
}

export interface ApiStockReservationStockReservation
  extends Struct.CollectionTypeSchema {
  collectionName: 'stock_reservations';
  info: {
    description: 'Stock reservations for pending orders';
    displayName: 'Stock Reservation';
    pluralName: 'stock-reservations';
    singularName: 'stock-reservation';
  };
  options: {
    comment: 'Stock reservation system for pending orders';
    draftAndPublish: false;
  };
  attributes: {
    completedAt: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    customer: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    expiresAt: Schema.Attribute.DateTime & Schema.Attribute.Required;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::stock-reservation.stock-reservation'
    > &
      Schema.Attribute.Private;
    metadata: Schema.Attribute.JSON;
    order: Schema.Attribute.Relation<'manyToOne', 'api::order.order'> &
      Schema.Attribute.Required;
    product: Schema.Attribute.Relation<'manyToOne', 'api::product.product'> &
      Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    quantity: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMax<
        {
          min: 1;
        },
        number
      >;
    reason: Schema.Attribute.String;
    sessionId: Schema.Attribute.String;
    status: Schema.Attribute.Enumeration<
      ['active', 'completed', 'expired', 'cancelled']
    > &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'active'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiUserActivityUserActivity
  extends Struct.CollectionTypeSchema {
  collectionName: 'user_activities';
  info: {
    description: 'Tracks user activities including login, logout, profile updates, and other interactions';
    displayName: 'User Activity';
    pluralName: 'user-activities';
    singularName: 'user-activity';
  };
  options: {
    comment: 'User activity tracking for analytics and security monitoring';
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: true;
    };
    'content-type-builder': {
      visible: true;
    };
  };
  attributes: {
    activityData: Schema.Attribute.JSON;
    activityType: Schema.Attribute.Enumeration<
      [
        'login',
        'logout',
        'profile_update',
        'preference_change',
        'page_view',
        'product_interaction',
        'account_created',
        'password_change',
        'session_expired',
      ]
    > &
      Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceInfo: Schema.Attribute.JSON;
    errorMessage: Schema.Attribute.Text;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-activity.user-activity'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    sessionDuration: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    sessionId: Schema.Attribute.String;
    success: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<true>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    userAgent: Schema.Attribute.Text;
  };
}

export interface ApiUserBehaviorUserBehavior
  extends Struct.CollectionTypeSchema {
  collectionName: 'user_behaviors';
  info: {
    description: 'Track user behavior and interaction patterns for analytics';
    displayName: 'User Behavior';
    pluralName: 'user-behaviors';
    singularName: 'user-behavior';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    i18n: {
      localized: false;
    };
  };
  attributes: {
    behaviorData: Schema.Attribute.JSON;
    behaviorType: Schema.Attribute.Enumeration<
      [
        'page_view',
        'product_view',
        'search',
        'cart_add',
        'purchase',
        'wishlist_add',
        'category_browse',
        'filter_apply',
        'sort_change',
        'review_submit',
        'rating_give',
        'concurrent_test',
        'preference_change',
      ]
    > &
      Schema.Attribute.Required;
    categoryId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceInfo: Schema.Attribute.JSON;
    interactions: Schema.Attribute.JSON;
    ipAddress: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 45;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-behavior.user-behavior'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    metadata: Schema.Attribute.JSON;
    pageUrl: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    productId: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }>;
    publishedAt: Schema.Attribute.DateTime;
    referrer: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    scrollDepth: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 100;
          min: 0;
        },
        number
      >;
    searchQuery: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
    sessionId: Schema.Attribute.String;
    timeSpent: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          min: 0;
        },
        number
      >;
    timestamp: Schema.Attribute.DateTime & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.user'
    >;
    userAgent: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 1000;
      }>;
  };
}

export interface ApiUserPreferenceUserPreference
  extends Struct.CollectionTypeSchema {
  collectionName: 'user_preferences';
  info: {
    description: 'User account preferences and settings including communication, notifications, security, and localization';
    displayName: 'User Preference';
    pluralName: 'user-preferences';
    singularName: 'user-preference';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    communicationConsentDate: Schema.Attribute.DateTime;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
      }> &
      Schema.Attribute.DefaultTo<'USD'>;
    dateFormat: Schema.Attribute.Enumeration<
      ['MM_DD_YYYY', 'DD_MM_YYYY', 'YYYY_MM_DD', 'DD_DOT_MM_DOT_YYYY']
    > &
      Schema.Attribute.DefaultTo<'MM_DD_YYYY'>;
    deviceTracking: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    emailMarketing: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    emailNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    language: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }> &
      Schema.Attribute.DefaultTo<'en'>;
    lastPasswordChange: Schema.Attribute.DateTime;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-preference.user-preference'
    > &
      Schema.Attribute.Private;
    loginNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    notificationFrequency: Schema.Attribute.Enumeration<
      ['immediate', 'daily', 'weekly', 'disabled']
    > &
      Schema.Attribute.DefaultTo<'immediate'>;
    numberFormat: Schema.Attribute.Enumeration<
      ['COMMA_DOT', 'DOT_COMMA', 'SPACE_COMMA', 'SPACE_DOT']
    > &
      Schema.Attribute.DefaultTo<'COMMA_DOT'>;
    orderStatusNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    orderUpdates: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    promotionalEmails: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    promotionalNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    publishedAt: Schema.Attribute.DateTime;
    securityNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<true>;
    sessionTimeout: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 86400;
          min: 300;
        },
        number
      > &
      Schema.Attribute.DefaultTo<3600>;
    smsNotificationEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    smsNotifications: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    theme: Schema.Attribute.Enumeration<['light', 'dark', 'auto']> &
      Schema.Attribute.DefaultTo<'auto'>;
    timezone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 100;
      }> &
      Schema.Attribute.DefaultTo<'UTC'>;
    twoFactorEnabled: Schema.Attribute.Boolean &
      Schema.Attribute.DefaultTo<false>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.String;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    activities: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-activity.user-activity'
    >;
    addresses: Schema.Attribute.Relation<'oneToMany', 'api::address.address'>;
    bio: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 500;
      }>;
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    carts: Schema.Attribute.Relation<'oneToMany', 'api::cart.cart'>;
    confirmationToken: Schema.Attribute.String;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 3;
      }> &
      Schema.Attribute.DefaultTo<'USD'>;
    dateOfBirth: Schema.Attribute.Date;
    email: Schema.Attribute.Email &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    emailVerified: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    engagement_metrics: Schema.Attribute.Relation<
      'oneToMany',
      'api::engagement-metrics.engagement-metric'
    >;
    firstName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    gender: Schema.Attribute.Enumeration<
      ['male', 'female', 'other', 'prefer-not-to-say']
    >;
    isActive: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<true>;
    language: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 10;
      }> &
      Schema.Attribute.DefaultTo<'en'>;
    lastName: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    password: Schema.Attribute.Password;
    phone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 20;
      }>;
    preferences: Schema.Attribute.Relation<
      'oneToOne',
      'api::user-preference.user-preference'
    >;
    privacySettings: Schema.Attribute.Relation<
      'oneToOne',
      'api::privacy-setting.privacy-setting'
    >;
    profilePicture: Schema.Attribute.Media<'images'>;
    provider: Schema.Attribute.String & Schema.Attribute.DefaultTo<'local'>;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    security_events: Schema.Attribute.Relation<
      'oneToMany',
      'api::security-event.security-event'
    >;
    timezone: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 50;
      }> &
      Schema.Attribute.DefaultTo<'UTC'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_behaviors: Schema.Attribute.Relation<
      'oneToMany',
      'api::user-behavior.user-behavior'
    >;
    username: Schema.Attribute.String &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    website: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        maxLength: 255;
      }>;
    wishlist: Schema.Attribute.Relation<
      'manyToMany',
      'api::product-listing.product-listing'
    >;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::address.address': ApiAddressAddress;
      'api::cart.cart': ApiCartCart;
      'api::cart.cart-item': ApiCartCartItem;
      'api::category.category': ApiCategoryCategory;
      'api::checkout-activity.checkout-activity': ApiCheckoutActivityCheckoutActivity;
      'api::checkout.checkout': ApiCheckoutCheckout;
      'api::engagement-metrics.engagement-metric': ApiEngagementMetricsEngagementMetric;
      'api::guest.guest': ApiGuestGuest;
      'api::inventory-history.inventory-history': ApiInventoryHistoryInventoryHistory;
      'api::inventory.inventory': ApiInventoryInventory;
      'api::option-group.option-group': ApiOptionGroupOptionGroup;
      'api::option-value.option-value': ApiOptionValueOptionValue;
      'api::order.order': ApiOrderOrder;
      'api::order.order-history': ApiOrderOrderHistory;
      'api::order.order-item': ApiOrderOrderItem;
      'api::order.order-status': ApiOrderOrderStatus;
      'api::order.order-tracking': ApiOrderOrderTracking;
      'api::payment-comment.payment-comment': ApiPaymentCommentPaymentComment;
      'api::payment-method.payment-method': ApiPaymentMethodPaymentMethod;
      'api::payment.payment': ApiPaymentPayment;
      'api::payment.payment-confirmation': ApiPaymentPaymentConfirmation;
      'api::privacy-setting.privacy-setting': ApiPrivacySettingPrivacySetting;
      'api::product-listing-variant.product-listing-variant': ApiProductListingVariantProductListingVariant;
      'api::product-listing.product-listing': ApiProductListingProductListing;
      'api::product.product': ApiProductProduct;
      'api::security-event.security-event': ApiSecurityEventSecurityEvent;
      'api::stock-reservation.stock-reservation': ApiStockReservationStockReservation;
      'api::user-activity.user-activity': ApiUserActivityUserActivity;
      'api::user-behavior.user-behavior': ApiUserBehaviorUserBehavior;
      'api::user-preference.user-preference': ApiUserPreferenceUserPreference;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
