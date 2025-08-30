import React from 'react';

interface RoleSelectorProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  intlLabel: {
    id: string;
    defaultMessage: string;
  };
  required?: boolean;
  disabled?: boolean;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
  value,
  onChange,
  name,
  intlLabel,
  required = false,
  disabled = false,
}) => {
  const roles = [
    { value: 'customer', label: 'Customer' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'support', label: 'Support' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  return (
    <div>
      <label htmlFor={name} className="form-label">
        {intlLabel.defaultMessage}
        {required && <span className="required">*</span>}
      </label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="form-select"
      >
        <option value="">Select a role</option>
        {roles.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RoleSelector;
