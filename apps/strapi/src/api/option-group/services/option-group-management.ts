/**
 * option-group-management service
 */

export default ({ strapi }) => ({
  /**
   * Validate option group creation data
   */
  async validateOptionGroupData(data) {
    const errors = [];

    // Check required fields
    if (!data.name) {
      errors.push('Name is required');
    }
    if (!data.displayName) {
      errors.push('Display name is required');
    }

    // Check name uniqueness
    if (data.name) {
      const existingOptionGroup = await strapi
        .documents('api::option-group.option-group')
        .findFirst({
          filters: { name: data.name },
        });
      if (existingOptionGroup) {
        errors.push('Option group name must be unique');
      }
    }

    // Validate type
    if (data.type && !['select', 'radio', 'checkbox'].includes(data.type)) {
      errors.push('Type must be select, radio, or checkbox');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Create option group with default option values
   */
  async createOptionGroupWithDefaults(data) {
    const optionGroup = await strapi
      .documents('api::option-group.option-group')
      .create({
        data,
        populate: ['optionValues'],
      });

    // Create default option values based on common patterns
    const defaultValues = this.getDefaultValuesForOptionGroup(data.name);

    for (const defaultValue of defaultValues) {
      await strapi.documents('api::option-value.option-value').create({
        data: {
          ...defaultValue,
          optionGroup: optionGroup.documentId,
        },
      });
    }

    return optionGroup;
  },

  /**
   * Get default option values for common option groups
   */
  getDefaultValuesForOptionGroup(name) {
    const defaults = {
      size: [
        { value: 'XS', displayName: 'Extra Small', sortOrder: 1 },
        { value: 'S', displayName: 'Small', sortOrder: 2 },
        { value: 'M', displayName: 'Medium', sortOrder: 3 },
        { value: 'L', displayName: 'Large', sortOrder: 4 },
        { value: 'XL', displayName: 'Extra Large', sortOrder: 5 },
        { value: 'XXL', displayName: '2XL', sortOrder: 6 },
      ],
      color: [
        { value: 'black', displayName: 'Black', sortOrder: 1 },
        { value: 'white', displayName: 'White', sortOrder: 2 },
        { value: 'red', displayName: 'Red', sortOrder: 3 },
        { value: 'blue', displayName: 'Blue', sortOrder: 4 },
        { value: 'green', displayName: 'Green', sortOrder: 5 },
        { value: 'yellow', displayName: 'Yellow', sortOrder: 6 },
        { value: 'purple', displayName: 'Purple', sortOrder: 7 },
        { value: 'pink', displayName: 'Pink', sortOrder: 8 },
        { value: 'orange', displayName: 'Orange', sortOrder: 9 },
        { value: 'brown', displayName: 'Brown', sortOrder: 10 },
        { value: 'gray', displayName: 'Gray', sortOrder: 11 },
      ],
      material: [
        { value: 'cotton', displayName: 'Cotton', sortOrder: 1 },
        { value: 'polyester', displayName: 'Polyester', sortOrder: 2 },
        { value: 'wool', displayName: 'Wool', sortOrder: 3 },
        { value: 'silk', displayName: 'Silk', sortOrder: 4 },
        { value: 'linen', displayName: 'Linen', sortOrder: 5 },
        { value: 'denim', displayName: 'Denim', sortOrder: 6 },
        { value: 'leather', displayName: 'Leather', sortOrder: 7 },
        { value: 'suede', displayName: 'Suede', sortOrder: 8 },
      ],
      style: [
        { value: 'casual', displayName: 'Casual', sortOrder: 1 },
        { value: 'formal', displayName: 'Formal', sortOrder: 2 },
        { value: 'sport', displayName: 'Sport', sortOrder: 3 },
        { value: 'business', displayName: 'Business', sortOrder: 4 },
        { value: 'vintage', displayName: 'Vintage', sortOrder: 5 },
        { value: 'modern', displayName: 'Modern', sortOrder: 6 },
      ],
    };

    return defaults[name.toLowerCase()] || [];
  },

  /**
   * Assign option group to product listing
   */
  async assignToProductListing(optionGroupId, productListingId) {
    const optionGroup = await strapi
      .documents('api::option-group.option-group')
      .findOne({
        documentId: optionGroupId,
        populate: ['productListings'],
      });

    if (!optionGroup) {
      throw new Error('Option group not found');
    }

    const productListing = await strapi
      .documents('api::product-listing.product-listing')
      .findOne({
        documentId: productListingId,
      });

    if (!productListing) {
      throw new Error('Product listing not found');
    }

    // Check if already assigned
    const isAlreadyAssigned = optionGroup.productListings.some(
      pl => pl.documentId === productListingId
    );

    if (!isAlreadyAssigned) {
      await strapi.documents('api::option-group.option-group').update({
        documentId: optionGroupId,
        data: {
          productListings: [
            ...optionGroup.productListings.map(pl => pl.documentId),
            productListingId,
          ],
        },
      });
    }

    return { success: true };
  },

  /**
   * Remove option group from product listing
   */
  async removeFromProductListing(optionGroupId, productListingId) {
    const optionGroup = await strapi
      .documents('api::option-group.option-group')
      .findOne({
        documentId: optionGroupId,
        populate: ['productListings'],
      });

    if (!optionGroup) {
      throw new Error('Option group not found');
    }

    const updatedProductListings = optionGroup.productListings
      .filter(pl => pl.documentId !== productListingId)
      .map(pl => pl.documentId);

    await strapi.documents('api::option-group.option-group').update({
      documentId: optionGroupId,
      data: {
        productListings: updatedProductListings,
      },
    });

    return { success: true };
  },

  /**
   * Get option groups with their option values
   */
  async getOptionGroupsWithValues(optionGroupIds = null) {
    const filters = optionGroupIds
      ? { documentId: { $in: optionGroupIds } }
      : {};

    const optionGroups = await strapi
      .documents('api::option-group.option-group')
      .findMany({
        filters,
        sort: { sortOrder: 'asc' },
        populate: ['optionValues'],
      });

    return optionGroups;
  },

  /**
   * Validate option group deletion
   */
  async validateOptionGroupDeletion(documentId) {
    const optionGroup = await strapi
      .documents('api::option-group.option-group')
      .findOne({
        documentId,
        populate: ['optionValues', 'productListings'],
      });

    if (!optionGroup) {
      return {
        canDelete: false,
        reason: 'Option group not found',
      };
    }

    if (optionGroup.optionValues.length > 0) {
      return {
        canDelete: false,
        reason: 'Cannot delete option group with existing option values',
      };
    }

    if (optionGroup.productListings.length > 0) {
      return {
        canDelete: false,
        reason:
          'Cannot delete option group that is assigned to product listings',
      };
    }

    return {
      canDelete: true,
      reason: 'Option group can be deleted',
    };
  },
});
