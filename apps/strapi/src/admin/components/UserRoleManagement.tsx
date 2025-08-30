import React, { useState, useEffect } from 'react';

interface UserRoleManagementProps {
  userId: number;
  currentRole: string;
}

const UserRoleManagement: React.FC<UserRoleManagementProps> = ({
  userId,
  currentRole,
}) => {
  const [selectedRole, setSelectedRole] = useState(currentRole);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const roles = [
    { value: 'customer', label: 'Customer' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'support', label: 'Support' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleRoleChange = async () => {
    if (selectedRole === currentRole) return;

    try {
      setLoading(true);
      setMessage(null);

      const response = await fetch('/api/role-management/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          role: selectedRole,
        }),
      });

      if (response.ok) {
        setMessage({
          type: 'success',
          text: `Role changed to ${selectedRole} successfully`,
        });
      } else {
        const errorData = await response.json();
        setMessage({
          type: 'error',
          text: errorData.message || 'Failed to change role',
        });
        setSelectedRole(currentRole); // Reset to current role
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Error changing role',
      });
      setSelectedRole(currentRole); // Reset to current role
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-role-management">
      <h3>Role Management</h3>
      
      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'danger'}`}>
          {message.text}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="role-select">User Role</label>
        <select
          id="role-select"
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          disabled={loading}
          className="form-select"
        >
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
      </div>

      {selectedRole !== currentRole && (
        <button
          onClick={handleRoleChange}
          disabled={loading}
          className="btn btn-primary"
        >
          {loading ? 'Updating...' : 'Update Role'}
        </button>
      )}

      <div className="role-info mt-3">
        <h4>Role Permissions</h4>
        <div className="permissions-list">
          {selectedRole === 'customer' && (
            <ul>
              <li>View products and categories</li>
              <li>Create and view orders</li>
              <li>Manage addresses</li>
              <li>Manage preferences</li>
            </ul>
          )}
          {selectedRole === 'admin' && (
            <ul>
              <li>Full system access</li>
              <li>Manage all users and roles</li>
              <li>Create, edit, and delete all content</li>
              <li>System administration</li>
            </ul>
          )}
          {selectedRole === 'manager' && (
            <ul>
              <li>Product and category management</li>
              <li>Order management</li>
              <li>User management (read/update)</li>
              <li>Inventory management</li>
            </ul>
          )}
          {selectedRole === 'support' && (
            <ul>
              <li>View products and categories</li>
              <li>View and update orders</li>
              <li>View user information</li>
              <li>Customer support access</li>
            </ul>
          )}
          {selectedRole === 'moderator' && (
            <ul>
              <li>View and update products</li>
              <li>View and update orders</li>
              <li>View and update users</li>
              <li>Content moderation</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserRoleManagement;
