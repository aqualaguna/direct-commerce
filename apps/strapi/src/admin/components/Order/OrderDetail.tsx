/**
 * Order Detail Component
 * Admin panel component for viewing and editing individual orders
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Print,
  Email,
  LocalShipping,
  Payment,
  Person,
  LocationOn,
  ExpandMore,
  Timeline,
  Receipt
} from '@mui/icons-material';

interface OrderItem {
  documentId: string;
  productName: string;
  productDescription?: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  linePrice: number;
  discountAmount: number;
  taxAmount: number;
  productListing?: {
    documentId: string;
    name: string;
    images?: Array<{ url: string }>;
  };
}

interface Order {
  documentId: string;
  orderNumber: string;
  user: {
    documentId: string;
    email: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'confirmed' | 'paid' | 'failed' | 'refunded' | 'cancelled';
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  billingAddress: {
    firstName: string;
    lastName: string;
    company?: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone?: string;
  };
  paymentMethod: string;
  shippingMethod: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  customerNotes?: string;
  adminNotes?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

interface OrderDetailProps {
  orderId: string;
  onClose?: () => void;
  onOrderUpdate?: (order: Order) => void;
}

const OrderDetail: React.FC<OrderDetailProps> = ({
  orderId,
  onClose,
  onOrderUpdate
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<Order>>({});
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusNotes, setStatusNotes] = useState<string>('');

  // Status workflow steps
  const statusSteps = [
    { label: 'Pending', value: 'pending' },
    { label: 'Confirmed', value: 'confirmed' },
    { label: 'Processing', value: 'processing' },
    { label: 'Shipped', value: 'shipped' },
    { label: 'Delivered', value: 'delivered' }
  ];

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order');
      }

      const orderData = await response.json();
      setOrder(orderData);
      setEditData(orderData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editData)
      });

      if (!response.ok) {
        throw new Error('Failed to update order');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      setEditData(updatedOrder);
      setEditing(false);
      onOrderUpdate?.(updatedOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order');
    }
  };

  const handleStatusUpdate = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = await response.json();
      setOrder(updatedOrder);
      setEditData(updatedOrder);
      setStatusDialogOpen(false);
      setNewStatus('');
      setStatusNotes('');
      onOrderUpdate?.(updatedOrder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update order status');
    }
  };

  const handlePrintReceipt = () => {
    // TODO: Implement receipt printing
    window.print();
  };

  const handleSendEmail = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}/email`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'order_confirmation',
          email: order?.user.email
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      // Show success message
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      processing: 'primary',
      shipped: 'secondary',
      delivered: 'success',
      cancelled: 'error',
      refunded: 'default'
    };
    return colors[status as keyof typeof colors] || 'default';
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    return statusSteps.findIndex(step => step.value === order.status);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!order) {
    return (
      <Alert severity="warning">
        Order not found
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1">
            Order #{order.orderNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Created on {formatDate(order.createdAt)}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          {!editing ? (
            <>
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                startIcon={<Print />}
                onClick={handlePrintReceipt}
              >
                Print
              </Button>
              <Button
                variant="outlined"
                startIcon={<Email />}
                onClick={handleSendEmail}
              >
                Email
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => {
                  setEditing(false);
                  setEditData(order);
                }}
              >
                Cancel
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* Status Stepper */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Order Status
        </Typography>
        <Stepper activeStep={getCurrentStepIndex()} orientation="horizontal">
          {statusSteps.map((step, index) => (
            <Step key={step.value}>
              <StepLabel>
                <Chip
                  label={step.label}
                  color={getCurrentStepIndex() >= index ? 'primary' : 'default'}
                  variant={getCurrentStepIndex() >= index ? 'filled' : 'outlined'}
                />
              </StepLabel>
            </Step>
          ))}
        </Stepper>
        <Box mt={2}>
          <Button
            variant="outlined"
            onClick={() => {
              setNewStatus(order.status);
              setStatusDialogOpen(true);
            }}
          >
            Update Status
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Order Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Information
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Order Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {order.orderNumber}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Chip
                    label={order.status}
                    color={getStatusColor(order.status)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Status
                  </Typography>
                  <Chip
                    label={order.paymentStatus}
                    color={getStatusColor(order.paymentStatus)}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Payment Method
                  </Typography>
                  <Typography variant="body1">
                    {order.paymentMethod}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Shipping Method
                  </Typography>
                  <Typography variant="body1">
                    {order.shippingMethod}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Tracking Number
                  </Typography>
                  <Typography variant="body1">
                    {order.trackingNumber || 'Not available'}
                  </Typography>
                </Grid>
              </Grid>

              {editing && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    Admin Notes
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    value={editData.adminNotes || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, adminNotes: e.target.value }))}
                    placeholder="Add internal notes..."
                  />
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Items
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell align="right">Quantity</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.documentId}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {item.productName}
                          </Typography>
                          {item.productDescription && (
                            <Typography variant="caption" color="text.secondary">
                              {item.productDescription}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{item.sku}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.unitPrice, order.currency)}
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(item.linePrice, order.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Customer Information */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              
              <Box display="flex" alignItems="center" mb={2}>
                <Person sx={{ mr: 1 }} />
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {order.user.firstName} {order.user.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {order.user.email}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Shipping Address
              </Typography>
              
              <Box display="flex" alignItems="flex-start" mb={2}>
                <LocationOn sx={{ mr: 1, mt: 0.5 }} />
                <Box>
                  <Typography variant="body2">
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                  </Typography>
                  {order.shippingAddress.company && (
                    <Typography variant="body2">
                      {order.shippingAddress.company}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    {order.shippingAddress.address1}
                  </Typography>
                  {order.shippingAddress.address2 && (
                    <Typography variant="body2">
                      {order.shippingAddress.address2}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                  </Typography>
                  <Typography variant="body2">
                    {order.shippingAddress.country}
                  </Typography>
                  {order.shippingAddress.phone && (
                    <Typography variant="body2">
                      {order.shippingAddress.phone}
                    </Typography>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Order Summary
              </Typography>
              
              <Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Subtotal</Typography>
                  <Typography variant="body2">{formatCurrency(order.subtotal, order.currency)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Tax</Typography>
                  <Typography variant="body2">{formatCurrency(order.tax, order.currency)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mb={1}>
                  <Typography variant="body2">Shipping</Typography>
                  <Typography variant="body2">{formatCurrency(order.shipping, order.currency)}</Typography>
                </Box>
                {order.discount > 0 && (
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography variant="body2">Discount</Typography>
                    <Typography variant="body2" color="error">
                      -{formatCurrency(order.discount, order.currency)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    {formatCurrency(order.total, order.currency)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Order Status</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>New Status</InputLabel>
            <Select
              value={newStatus}
              label="New Status"
              onChange={(e) => setNewStatus(e.target.value)}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="confirmed">Confirmed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="shipped">Shipped</MenuItem>
              <MenuItem value="delivered">Delivered</MenuItem>
              <MenuItem value="cancelled">Cancelled</MenuItem>
              <MenuItem value="refunded">Refunded</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Status Notes"
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            placeholder="Add notes about this status change..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleStatusUpdate}>
            Update Status
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetail;
