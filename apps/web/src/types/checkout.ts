export type CheckoutStepType = 'cart' | 'shipping' | 'billing' | 'payment' | 'review' | 'confirmation'

export interface CheckoutSession {
  id: string
  documentId: string
  user?: {
    id: string
    email: string
    firstName?: string
    lastName?: string
  }
  cart: {
    id: string
    documentId: string
    items: CartItem[]
    total: number
    subtotal: number
    tax: number
    shipping: number
  }
  sessionId?: string
  step: CheckoutStepType
  status: 'active' | 'completed' | 'abandoned' | 'expired'
  shippingAddress?: Address
  billingAddress?: Address
  shippingMethod?: ShippingMethod
  paymentMethod?: PaymentMethod
  order?: Order
  expiresAt: string
  createdAt: string
  updatedAt: string
  stepProgress?: StepProgress
  stepAnalytics?: Record<string, StepAnalytics>
}

export interface CartItem {
  id: string
  product: {
    id: string
    name: string
    price: number
    image?: string
  }
  quantity: number
  price: number
  total: number
}

export interface Address {
  id: string
  documentId: string
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
  isDefault: boolean
  validated: boolean
  validationErrors?: string[]
}

export interface ShippingMethod {
  id: string
  name: string
  description: string
  price: number
  estimatedDays: number
  isAvailable: boolean
}

export interface PaymentMethod {
  id: string
  type: 'credit_card' | 'paypal' | 'stripe'
  name: string
  description: string
  isAvailable: boolean
}

export interface Order {
  id: string
  documentId: string
  orderNumber: string
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  total: number
  items: OrderItem[]
  shippingAddress: Address
  billingAddress: Address
  shippingMethod: ShippingMethod
  paymentMethod: PaymentMethod
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  product: {
    id: string
    name: string
    price: number
    image?: string
  }
  quantity: number
  price: number
  total: number
}

export interface StepProgress {
  currentStep: CheckoutStepType
  completedSteps: string[]
  availableSteps: string[]
  nextStep?: CheckoutStepType
  previousStep?: CheckoutStepType
  canProceed: boolean
  errors: Record<string, string[]>
}

export interface StepAnalytics {
  timeSpent: number
  attempts: number
  completionRate: number
  averageTime: number
  abandonmentRate: number
}

export interface CheckoutFormData {
  [key: string]: any
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
}

export interface CheckoutFormState {
  formData: CheckoutFormData
  validationErrors: Record<string, string[]>
  isValid: boolean
  isSubmitting: boolean
  isSubmitted: boolean
}

export interface CheckoutSessionState {
  session: CheckoutSession | null
  loading: boolean
  error: string | null
  updating: boolean
}

export interface GuestCheckoutData {
  email: string
  firstName: string
  lastName: string
  phone?: string
  shippingAddress: Omit<Address, 'id' | 'documentId' | 'isDefault' | 'validated'>
  billingAddress?: Omit<Address, 'id' | 'documentId' | 'isDefault' | 'validated'>
  sameAsShipping?: boolean
}

export interface PaymentFormData {
  cardNumber: string
  expiryMonth: number
  expiryYear: number
  cvv: string
  cardholderName: string
  saveCard?: boolean
}

export interface ShippingFormData {
  firstName: string
  lastName: string
  company?: string
  address1: string
  address2?: string
  city: string
  state: string
  postalCode: string
  country: string
  phone: string
}

export interface BillingFormData {
  sameAsShipping: boolean
  firstName?: string
  lastName?: string
  company?: string
  address1?: string
  address2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  phone?: string
}

export interface ReviewFormData {
  termsAccepted: boolean
  privacyAccepted: boolean
  marketingAccepted?: boolean
  specialInstructions?: string
}

export interface CheckoutAnalytics {
  stepAnalytics: Record<string, StepAnalytics>
  sessionAnalytics: {
    timeSpent: number
    stepCount: number
    currentStep: CheckoutStepType
    status: string
    isExpired: boolean
  }
}

export interface CheckoutEvent {
  sessionId: string
  event: string
  data: any
  timestamp: string
}

export interface CheckoutConfig {
  allowGuestCheckout: boolean
  requireAccount: boolean
  autoSaveProgress: boolean
  sessionTimeout: number
  maxAttempts: number
  enableAnalytics: boolean
  enableValidation: boolean
  enableAccessibility: boolean
}
