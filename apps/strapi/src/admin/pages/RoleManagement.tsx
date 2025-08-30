import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

interface Role {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  roleAssignedBy?: number;
  roleAssignedAt?: string;
}

const RoleManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const predefinedRoles: Role[] = [
    {
      name: 'customer',
      displayName: 'Customer',
      description: 'Standard customer with basic shopping permissions',
      permissions: [
        'product.read',
        'category.read',
        'order.create',
        'order.read',
        'address.create',
        'address.read',
        'address.update',
        'address.delete',
      ],
      isSystem: true,
    },
    {
      name: 'admin',
      displayName: 'Administrator',
      description: 'Full system access with all permissions',
      permissions: [
        'product.create',
        'product.read',
        'product.update',
        'product.delete',
        'user.create',
        'user.read',
        'user.update',
        'user.delete',
        'role.assign',
        'role.revoke',
      ],
      isSystem: true,
    },
    {
      name: 'manager',
      displayName: 'Manager',
      description: 'Product and order management with limited user access',
      permissions: [
        'product.create',
        'product.read',
        'product.update',
        'category.create',
        'category.read',
        'category.update',
        'order.create',
        'order.read',
        'order.update',
        'user.read',
        'user.update',
      ],
      isSystem: false,
    },
    {
      name: 'support',
      displayName: 'Support',
      description: 'Customer support with read access to orders and users',
      permissions: [
        'product.read',
        'category.read',
        'order.read',
        'order.update',
        'user.read',
      ],
      isSystem: false,
    },
    {
      name: 'moderator',
      displayName: 'Moderator',
      description: 'Content moderation with limited management permissions',
      permissions: [
        'product.read',
        'product.update',
        'category.read',
        'order.read',
        'order.update',
        'user.read',
        'user.update',
      ],
      isSystem: false,
    },
  ];

  useEffect(() => {
    setRoles(predefinedRoles);
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Error fetching users');
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) {
      setError('Please select both user and role');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/role-management/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser,
          role: selectedRole,
        }),
      });

      if (response.ok) {
        setSuccess('Role assigned successfully');
        setSelectedUser(null);
        setSelectedRole('');
        fetchUsers();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to assign role');
      }
    } catch (err) {
      setError('Error assigning role');
    } finally {
      setLoading(false);
    }
  };

  const revokeRole = async (userId: number) => {
    try {
      setLoading(true);
      const response = await fetch('/api/role-management/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
        }),
      });

      if (response.ok) {
        setSuccess('Role revoked successfully');
        fetchUsers();
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to revoke role');
      }
    } catch (err) {
      setError('Error revoking role');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Role Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
        {/* Role Assignment Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Assign Role
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select User</InputLabel>
              <Select
                value={selectedUser || ''}
                onChange={(e) => setSelectedUser(e.target.value as number)}
                label="Select User"
              >
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.id}>
                    {user.username} ({user.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Role</InputLabel>
              <Select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                label="Select Role"
              >
                {roles.map((role) => (
                  <MenuItem key={role.name} value={role.name}>
                    {role.displayName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={assignRole}
              disabled={loading || !selectedUser || !selectedRole}
              fullWidth
            >
              {loading ? 'Assigning...' : 'Assign Role'}
            </Button>
          </CardContent>
        </Card>

        {/* Role Information Section */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Available Roles
            </Typography>
            {roles.map((role) => (
              <Box key={role.name} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {role.displayName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {role.description}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Permissions: {role.permissions.length}
                </Typography>
              </Box>
            ))}
          </CardContent>
        </Card>

        {/* User List Section */}
        <Card sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              User Roles
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>User</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Current Role</TableCell>
                    <TableCell>Assigned By</TableCell>
                    <TableCell>Assigned At</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          sx={{
                            backgroundColor: user.role === 'admin' ? '#ffebee' : '#e8f5e8',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            display: 'inline-block',
                          }}
                        >
                          {user.role}
                        </Typography>
                      </TableCell>
                      <TableCell>{user.roleAssignedBy || '-'}</TableCell>
                      <TableCell>
                        {user.roleAssignedAt
                          ? new Date(user.roleAssignedAt).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {user.role !== 'customer' && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => revokeRole(user.id)}
                            disabled={loading}
                          >
                            Revoke Role
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default RoleManagement;
