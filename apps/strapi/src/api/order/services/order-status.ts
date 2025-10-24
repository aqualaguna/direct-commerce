/**
 * Order Status Management Service
 * Handles order status transitions, validation, and automation
 */

export default {

  /**
   * Validate status update
   */
  async validateStatusUpdate(previousStatus: string, newStatus: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    // Define valid status transitions
    const validTransitions: { [key: string]: string[] } = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled', 'refunded'],
      'processing': ['shipping', 'cancelled', 'refunded'],
      'shipping': ['delivered'],
      'delivered': ['returned', 'refunded'],
      'cancelled': [], // No further transitions
      'refunded': [], // No further transitions
      'returned': [], // No further transitions
    }

    // Check if transition is valid
    if (!validTransitions[previousStatus] || !validTransitions[previousStatus].includes(newStatus)) {
      errors.push(`Invalid transition from ${previousStatus} to ${newStatus}`)
    }

    // Add warnings for specific transitions
    if (previousStatus === 'delivered' && newStatus === 'returned') {
      warnings.push('Returning a delivered order may require additional processing')
    }

    if (previousStatus === 'completed' && newStatus === 'refunded') {
      warnings.push('Refunding a completed order requires special handling')
    }

    if (newStatus === 'cancelled' && ['confirmed', 'processing', 'shipping'].includes(previousStatus)) {
      warnings.push('Cancelling an order in progress may require inventory adjustments')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  },
};
