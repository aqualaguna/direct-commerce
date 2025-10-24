import { Core } from "@strapi/strapi";
import { UserType } from "../../../../config/constant";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
    async validateFindOrderData(query: any, userType: UserType, userId: any) {
        const errors: string[] = [];
        const validatedData: any = {};
        
        // Validate the input data against the schema
        if (userType === UserType.AUTHENTICATED) {
            validatedData['user'] = {
                id: userId
            }            
        }
        if (userType === UserType.GUEST) {
            validatedData['sessionId'] = userId
        }
        // default value 3 years ago to now
        let defaultDateRange = {
            createdAt: {
                $gte: new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000),
                $lte: new Date()
            }
        }
        let tempDateRange: any = { createdAt: {} }
        
        if (query.startDate) {
            const startDate = new Date(query.startDate);
            if (isNaN(startDate.getTime())) {
                errors.push('Invalid start date format');
            } else {
                tempDateRange.createdAt.$gte = startDate;
            }
        }
        if (query.endDate) {
            const endDate = new Date(query.endDate);
            if (isNaN(endDate.getTime())) {
                errors.push('Invalid end date format');
            } else {
                tempDateRange.createdAt.$lte = endDate;
            }
        }
        
        // Use provided dates or fall back to defaults
        if (Object.keys(tempDateRange.createdAt).length > 0) {
            // Merge with defaults for missing values
            validatedData['createdAt'] = {
                $gte: tempDateRange.createdAt.$gte || defaultDateRange.createdAt.$gte,
                $lte: tempDateRange.createdAt.$lte || defaultDateRange.createdAt.$lte
            };
            
            // Check if start date is before end date
            if (tempDateRange.createdAt.$gte && tempDateRange.createdAt.$lte) {
                if (tempDateRange.createdAt.$gte > tempDateRange.createdAt.$lte) {
                    errors.push('Start date must be before end date');
                }
            }
        } else {
            // Use default date range if no dates provided
            validatedData['createdAt'] = defaultDateRange.createdAt;
        }
        if (query.status) {
            // check for valid value
            const validStatusValue = [
                "pending",
                "confirmed",
                "processing",
                "shipping",
                "delivered",
                "cancelled",
                "refunded",
                "returned"
              ];
            if (!validStatusValue.includes(query.status)) {
                errors.push('Invalid status value: ' + query.status);
            } else {
                validatedData['status'] = query.status;
            }
        }
        if (query.keyword) {
            // check if keyword is a valid string
            if (typeof query.keyword !== 'string') {
                errors.push('Invalid keyword value: ' + query.keyword);
            } else {
                validatedData['$or'] = [
                    { orderNumber: { $containsi: query.keyword } },
                    { customerNotes: { $containsi: query.keyword } },
                    // item name, product name, product listing name
                    { 'items.product.name': { $containsi: query.keyword } },
                    { 'items.productListing.title': { $containsi: query.keyword } },
                ];
            }
        }
        // check for pagination
        if (query.page) {
            // must be positive integer
            const page = parseInt(query.page);
            if (isNaN(page) || page <= 0) {
                errors.push('Invalid page value: ' + query.page + '. Must be a positive number');
            }
        }
        if (query.pageSize) {
            const pageSize = parseInt(query.pageSize);
            if (isNaN(pageSize) || pageSize <= 0) {
                errors.push('Invalid page size value: ' + query.pageSize + '. Must be a positive number');
            }
        }
        return { isValid: errors.length === 0, errors, data: validatedData }
    }
})
